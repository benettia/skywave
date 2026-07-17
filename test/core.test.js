import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeBand, morseEncode, morseDecode, morseTiming, schedOn, runTests } from './load.mjs';
import { bandHash, PIN_SEED } from './band-hash.mjs';
import { readFileSync } from 'node:fs';

// the in-page harness (index.html?test) is the same suite the browser runs —
// every case must pass individually so a failure names itself.
for (const [name, ok] of runTests())
  test(`harness: ${name}`, () => assert.equal(ok, true));

test('determinism: same seed, identical band, twice', () => {
  assert.deepEqual(makeBand(777), makeBand(777));
});

test('determinism: pinned band hash for seed ' + PIN_SEED, () => {
  const pin = readFileSync(new URL('fixtures/band-layout.sha256', import.meta.url), 'utf8').trim();
  assert.equal(bandHash(), pin,
    'band generator output changed — if intentional, update test/fixtures/band-layout.sha256 in the same commit');
});

test('band edges: all stations inside 3–30 MHz with margin', () => {
  for (const s of makeBand(1)) assert.ok(s.f >= 3000 && s.f <= 30000, `station at ${s.f}`);
});

test('morse: exact timing atoms', () => {
  // E = dit; standalone letter ends with word gap
  assert.deepEqual(morseTiming(morseEncode('E')), [[1, 7]]);
  // PARIS timing: 50 units total is the canonical word
  const units = morseTiming(morseEncode('PARIS')).flat().reduce((a, b) => a + b, 0);
  assert.equal(units, 50);
});

test('morse: round-trip survives digits and mixed case', () => {
  const m = 'vvv de k7ab 599 qsl';
  assert.equal(morseDecode(morseEncode(m)), m.toUpperCase());
});

test('schedule: hourly window boundaries half-open', () => {
  const d = (h, m) => new Date(Date.UTC(2026, 0, 1, h, m));
  const sc = { t: 'h', m0: 30, m1: 40 };
  assert.equal(schedOn(sc, d(9, 30)), true);
  assert.equal(schedOn(sc, d(9, 39)), true);
  assert.equal(schedOn(sc, d(9, 40)), false);
  assert.equal(schedOn(sc, d(9, 29)), false);
});

test('schedule: daily window wrapping UTC midnight', () => {
  const d = h => new Date(Date.UTC(2026, 5, 15, h, 0));
  const sc = { t: 'd', h0: 21, h1: 3 };
  for (const h of [21, 23, 0, 2]) assert.equal(schedOn(sc, d(h)), true, `h=${h}`);
  for (const h of [3, 12, 20]) assert.equal(schedOn(sc, d(h)), false, `h=${h}`);
});
