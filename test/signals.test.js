import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/rng.js';
import { rttyEncode, rttyDecode, rttyText, freqOf, UNIT, BAUD, MARK_HZ, SPACE_HZ } from '../src/rtty.js';
import { intervalMelody, digitGroups, numbersScript, beepFreqs, SIGNOFF_HZ, SCALE } from '../src/numbers.js';

test('rtty: physical constants pinned', () => {
  assert.equal(SPACE_HZ, 1445);
  assert.equal(MARK_HZ, 1615);
  assert.equal(freqOf(0), 1445);
  assert.equal(freqOf(1), 1615);
  assert.equal(BAUD, 45.45);
  assert.ok(Math.abs(UNIT - 0.022) < 0.001, `unit ${UNIT}`);
});

test('rtty: exact framing — RY is the alternating test pair', () => {
  // R=10 → lsb-first 01010, Y=21 → 10101; start 0, two stop 1s per frame
  assert.deepEqual(rttyEncode('RY'), [
    0, 0, 1, 0, 1, 0, 1, 1,
    0, 1, 0, 1, 0, 1, 1, 1,
  ]);
});

test('rtty: every frame is start(0) + 5 data + stop(1,1)', () => {
  const bits = rttyEncode('CQ CQ DE X1AB 599 = QSL?');
  assert.equal(bits.length % 8, 0);
  for (let i = 0; i < bits.length; i += 8) {
    assert.equal(bits[i], 0, `start bit at ${i}`);
    assert.equal(bits[i + 6], 1, `stop bit at ${i + 6}`);
    assert.equal(bits[i + 7], 1, `stop bit at ${i + 7}`);
  }
  for (const b of bits) assert.ok(b === 0 || b === 1);
});

test('rtty: round-trip exact through letters, digits, shifts', () => {
  for (const m of [
    'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG',
    '0123456789',
    'A1B2C3 X9Y8Z7',                 // shift chatter every other char
    'MSG NR 12345 = 67890 / QRT?',
    'RYRYRY RYRYRY',
  ]) assert.equal(rttyDecode(rttyEncode(m)), m);
});

test('rtty: lowercase folds up, unencodable chars drop', () => {
  assert.equal(rttyDecode(rttyEncode('cq de k1ab')), 'CQ DE K1AB');
  assert.equal(rttyDecode(rttyEncode('A~B%C')), 'ABC');
});

test('rtty: decoder hunts start bits through mark idle', () => {
  const idle = [1, 1, 1, 1, 1, 1, 1];
  const bits = [...idle, ...rttyEncode('SOS'), ...idle, ...rttyEncode('73'), ...idle];
  assert.equal(rttyDecode(bits), 'SOS73');
});

test('rtty: truncated tail drops the partial frame, no throw', () => {
  const bits = rttyEncode('ABC');
  assert.equal(rttyDecode(bits.slice(0, -6)), 'AB');
});

test('rtty: station tape is deterministic and survives its own framing', () => {
  const tape = rttyText(mulberry32(42));
  assert.equal(tape, rttyText(mulberry32(42)));
  assert.notEqual(tape, rttyText(mulberry32(43)));
  assert.match(tape, /^RYRYRY RYRYRY DE ([RNKM][DFGV]\d\d) \1 MSG/);
  assert.match(tape, /MSG NR \d{5} = \d{5} \d{5} \d{5} = AR$/);
  assert.equal(rttyDecode(rttyEncode(tape)), tape);
});

test('numbers: melody is 5–7 notes off the scale, deterministic', () => {
  for (const seed of [1, 7, 123456]) {
    const m = intervalMelody(mulberry32(seed));
    assert.ok(m.length >= 5 && m.length <= 7, `len ${m.length}`);
    for (const n of m) assert.ok(SCALE.includes(n), `note ${n}`);
    assert.deepEqual(m, intervalMelody(mulberry32(seed)));
  }
});

test('numbers: six groups of exactly five digits', () => {
  const g = digitGroups(mulberry32(9));
  assert.equal(g.length, 6);
  for (const grp of g) assert.match(grp, /^\d{5}$/);
});

test('numbers: script speaks the groups then repeats them, then signs off', () => {
  const s = numbersScript(mulberry32(11));
  assert.equal(s.spoken.length, 12);
  assert.deepEqual(s.spoken.slice(0, 6), s.groups);
  assert.deepEqual(s.spoken.slice(6), s.groups);
  assert.deepEqual(s.signoff, [820, 700, 580]);
  assert.deepEqual(s.signoff, SIGNOFF_HZ);
});

test('numbers: consecutive cycles off one stream differ, same stream replays same', () => {
  const r = mulberry32(5);
  const a = numbersScript(r), b = numbersScript(r);
  assert.notDeepEqual(a.groups, b.groups);
  const r2 = mulberry32(5);
  assert.deepEqual(numbersScript(r2).groups, a.groups);
});

test('numbers: beep fallback maps each digit to a distinct two-tone pair', () => {
  const pairs = Array.from({ length: 10 }, (_, d) => beepFreqs(d));
  assert.deepEqual(pairs[0], [560, 1180]);
  assert.deepEqual(pairs[9], [560 + 9 * 52, 1180 + 9 * 52]);
  assert.equal(new Set(pairs.map(p => p.join())).size, 10);
});
