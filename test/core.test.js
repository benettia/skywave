import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, split } from '../src/rng.js';
import { makeBand, schedOn, strength, nearest } from '../src/band.js';
import { morseEncode, morseDecode, morseTiming } from '../src/morse.js';
import { bandHash, PIN_SEED } from './band-hash.mjs';
import { readFileSync } from 'node:fs';

const take = (r, n) => Array.from({ length: n }, r);

test('rng: same seed, identical stream, twice', () => {
  assert.deepEqual(take(mulberry32(42), 16), take(mulberry32(42), 16));
});

test('rng: outputs stay in [0,1)', () => {
  for (const v of take(mulberry32(7), 1000)) assert.ok(v >= 0 && v < 1);
});

test('rng: split streams are deterministic and independent of each other', () => {
  assert.deepEqual(take(split(123, 5), 8), take(split(123, 5), 8));
  assert.notDeepEqual(take(split(123, 5), 8), take(split(123, 6), 8));
  // splitting must not disturb the parent stream
  const r = mulberry32(9); r(); split(9, 1);
  const r2 = mulberry32(9); r2();
  assert.equal(r(), r2());
});

test('determinism: same seed, identical band, twice', () => {
  assert.deepEqual(makeBand(777), makeBand(777));
});

test('determinism: different seed, different band', () => {
  assert.notDeepEqual(makeBand(12345).map(s => s.f), makeBand(99).map(s => s.f));
});

test('determinism: pinned band hash for seed ' + PIN_SEED, () => {
  const pin = readFileSync(new URL('fixtures/band-layout.sha256', import.meta.url), 'utf8').trim();
  assert.equal(bandHash(), pin,
    'band generator output changed — if intentional, update test/fixtures/band-layout.sha256 in the same commit');
});

test('band: 40 stations, exact type mix 7n/8m/7r/18c', () => {
  const b = makeBand(1), n = ty => b.filter(s => s.ty === ty).length;
  assert.equal(b.length, 40);
  assert.deepEqual([n('n'), n('m'), n('r'), n('c')], [7, 8, 7, 18]);
});

test('band: edges inside 3.05–29.85 MHz, sorted, spaced >15 kHz', () => {
  for (const seed of [1, 123456, 987654]) {
    const b = makeBand(seed);
    for (const s of b) assert.ok(s.f >= 3050 && s.f <= 29850, `station at ${s.f}`);
    for (let i = 1; i < b.length; i++) assert.ok(b[i].f - b[i - 1].f > 15, `gap at ${b[i].f}`);
  }
});

test('band: exactly 4 jammers, all parked on numbers stations', () => {
  const j = makeBand(2).filter(s => s.jam);
  assert.equal(j.length, 4);
  for (const s of j) assert.equal(s.ty, 'n');
});

test('band: beacons carry decodable callsign + message', () => {
  for (const s of makeBand(3).filter(s => s.ty === 'm')) {
    assert.match(s.cs, /^[KWVUX]\d[A-Z]{2}$/);
    assert.ok(s.msg.startsWith('VVV DE ' + s.cs));
    assert.equal(morseDecode(morseEncode(s.msg)), s.msg);
  }
});

test('band: hourly windows are 8–15 min and stay inside the hour', () => {
  for (const s of makeBand(4)) if (s.sc.t === 'h') {
    const len = s.sc.m1 - s.sc.m0;
    assert.ok(len >= 8 && len <= 15, `window ${s.sc.m0}–${s.sc.m1}`);
    assert.ok(s.sc.m1 <= 60, `window ${s.sc.m0}–${s.sc.m1}`);
  }
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

// local-time constructors on purpose: propagation blends by local daylight
const local = h => new Date(2026, 0, 1, h, 0);
const noonish = local(12), nightish = local(0);

test('strength: zero off-schedule, bounded by base on-schedule', () => {
  const st = { f: 7100, base: .8, fr: .1, fp: 0, sc: { t: 'd', h0: 22, h1: 4 } };
  assert.equal(strength(st, new Date(Date.UTC(2026, 0, 1, 12, 0)), 0), 0);
  for (let t = 0; t < 20; t += .7) {
    const s = strength({ ...st, sc: { t: 'a' } }, noonish, t);
    assert.ok(s > 0 && s <= st.base, `s=${s}`);
  }
});

test('strength: low band carries at night, high band by day', () => {
  const mk = f => ({ f, base: 1, fr: .1, fp: 0, sc: { t: 'a' } });
  // same t → fade cancels; only propagation differs
  assert.ok(strength(mk(3500), nightish, 5) > strength(mk(3500), noonish, 5));
  assert.ok(strength(mk(29000), noonish, 5) > strength(mk(29000), nightish, 5));
});

test('strength: ionospheric fade is periodic in t at 1/fr', () => {
  const st = { f: 7100, base: 1, fr: .1, fp: 1, sc: { t: 'a' } };
  const a = strength(st, noonish, 3), b = strength(st, noonish, 3 + 2 * Math.PI / (6.283 * st.fr));
  assert.ok(Math.abs(a - b) < 1e-6);
});

test('nearest: picks closest station inside 6 kHz, null outside', () => {
  const band = [{ f: 7100 }, { f: 7112 }, { f: 9000 }];
  assert.equal(nearest(band, 7104), band[0]);
  assert.equal(nearest(band, 7109), band[1]);
  assert.equal(nearest(band, 7105.9), band[0]);
  assert.equal(nearest(band, 7106), null); // exactly 6 kHz from both — window is open
  assert.equal(nearest(band, 8000), null);
  assert.equal(nearest(band, 9005.9), band[2]);
});

test('morse: exact timing atoms', () => {
  assert.deepEqual(morseTiming(morseEncode('E')), [[1, 7]]);
  assert.deepEqual(morseTiming(morseEncode('A')), [[1, 1], [3, 7]]);
  assert.deepEqual(morseTiming(morseEncode('EE E')), [[1, 3], [1, 7], [1, 7]]);
  // PARIS timing: 50 units total is the canonical word
  const units = morseTiming(morseEncode('PARIS')).flat().reduce((a, b) => a + b, 0);
  assert.equal(units, 50);
});

test('morse: round-trip survives digits and mixed case', () => {
  const m = 'vvv de k7ab 599 qsl';
  assert.equal(morseDecode(morseEncode(m)), m.toUpperCase());
});
