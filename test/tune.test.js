// receiver math: pins, continuity through zero-beat, band-edge boundaries.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampF, selectivity, beatHz, hetLevel, noiseFloor, audioLevel } from '../src/tune.js';

const close = (a, b, eps = 1e-12) => assert.ok(Math.abs(a - b) <= eps, `${a} !~ ${b}`);

test('beat pitch is exactly the offset: 1 kHz off dial = 1 kHz tone', () => {
  assert.equal(beatHz(0), 0);
  assert.equal(beatHz(1), 1000);
  close(beatHz(.1), 100);
  close(beatHz(3.8), 3800, 1e-9);
});

test('beat → 0 at zero-beat, no sign flip: |beat(-x)| = beat(x) ≥ 0', () => {
  for (let off = -5; off <= 5; off += .097) {
    assert.ok(beatHz(off) >= 0);
    close(beatHz(off), beatHz(-off));
  }
});

test('beat glides continuously through zero — 1 Hz dial steps move pitch 1 Hz', () => {
  let prev = beatHz(-2);
  for (let i = -1999; i <= 2000; i++) {
    const b = beatHz(i / 1000);
    close(Math.abs(b - prev), 1, 1e-9); // no plateau, no jump
    prev = b;
  }
});

test('selectivity: quadratic, half-width 4 kHz, symmetric', () => {
  assert.equal(selectivity(0), 1);
  close(selectivity(1), .5625);   // (1 - 1/4)^2
  close(selectivity(2), .25);     // (1 - 2/4)^2
  assert.equal(selectivity(4), 0);
  assert.equal(selectivity(-4), 0);
  assert.equal(selectivity(9.9), 0); // dead past the skirt, never negative
  for (let off = 0; off <= 6; off += .11) close(selectivity(off), selectivity(-off));
});

test('selectivity falls monotonically with |offset|', () => {
  let prev = selectivity(0);
  for (let off = .05; off <= 5; off += .05) {
    const s = selectivity(off);
    assert.ok(s <= prev, `rose at ${off}`);
    prev = s;
  }
});

test('dial clamps to the 3–30 MHz band edges', () => {
  assert.equal(clampF(2999.9), 3000);
  assert.equal(clampF(-1), 3000);
  assert.equal(clampF(30000.1), 30000);
  assert.equal(clampF(1e9), 30000);
  assert.equal(clampF(3000), 3000);   // edges themselves pass through
  assert.equal(clampF(30000), 30000);
  assert.equal(clampF(7100), 7100);
});

test('heterodyne loudness: strong at zero-beat, gone above 3.8 kHz, linear in strength', () => {
  close(hetLevel(1, 0), .28);
  close(hetLevel(.5, 0), .14);
  assert.equal(hetLevel(1, 3800), 0);
  assert.equal(hetLevel(1, 5000), 0);   // clamped, never negative
  close(hetLevel(1, 1900), .14);        // halfway down the ramp
  assert.equal(hetLevel(0, 0), 0);      // no carrier, no whistle
});

test('noise floor ducks as the signal rises (AGC flavor), monotonically', () => {
  close(noiseFloor(0), .11);
  close(noiseFloor(1), .11 * .18);
  let prev = noiseFloor(0);
  for (let a = .05; a <= 1; a += .05) {
    const n = noiseFloor(a);
    assert.ok(n < prev, `floor rose at aud=${a}`);
    prev = n;
  }
});

test('BFO gate: morse and RTTY are silent carriers until the BFO is in', () => {
  for (const ty of ['m', 'r']) {
    assert.equal(audioLevel(ty, .7, false), 0);
    close(audioLevel(ty, .7, true), .63);
  }
  for (const ty of ['n', 'c']) for (const bfo of [false, true])
    close(audioLevel(ty, .7, bfo), .63); // voice/music don't care about the BFO
});
