// panel math: pinned segment truth table, readout layout invariants,
// meter ballistics, knob wrap seam.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEG, freqText, freqSegs, meterStep, needleDeg, knobAngle, knobDelta } from '../src/panel.js';

const close = (a, b, eps = 1e-12) => assert.ok(Math.abs(a - b) <= eps, `${a} !~ ${b}`);

test('7-seg truth table is the standard one, pinned bit-exact', () => {
  assert.deepEqual([...' 0123456789'].map(c => SEG[c]),
    [0, 0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f]);
});

test('readout is fixed 7-char layout, dp always at index 2, leading zero blanked', () => {
  assert.equal(freqText(7100), ' 7.1000');
  assert.equal(freqText(3050), ' 3.0500');
  assert.equal(freqText(29850), '29.8500');
  for (let fk = 3000; fk <= 30000; fk += 997.3) {
    const t = freqText(fk);
    assert.equal(t.length, 7);
    assert.equal(t.indexOf('.'), 2);
  }
});

test('freqSegs: six digit masks, dp stripped, 100 Hz steps move the last digit', () => {
  assert.deepEqual(freqSegs(7100), [0, SEG[7], SEG[1], SEG[0], SEG[0], SEG[0]]);
  assert.deepEqual(freqSegs(29850), [SEG[2], SEG[9], SEG[8], SEG[5], SEG[0], SEG[0]]);
  assert.equal(freqSegs(7100.1)[5], SEG[1]);
  assert.equal(freqSegs(7100.1).length, 6);
});

test('meter ballistics: attack .35/frame, decay .03/frame, pinned', () => {
  close(meterStep(0, 1), .35);
  close(meterStep(1, 0), .97);
  close(meterStep(.5, .5), .5); // fixed point at target
});

test('needle kicks up much faster than it falls', () => {
  const up = meterStep(0, 1) - 0, down = 1 - meterStep(1, 0);
  assert.ok(up > 10 * down, `attack ${up} not >> decay ${down}`);
});

test('meter converges to target from either side and never overshoots', () => {
  for (const [v0, t] of [[0, .8], [1, .2]]) {
    let v = v0;
    for (let i = 0; i < 400; i++) {
      const n = meterStep(v, t);
      assert.ok(n >= Math.min(v, t) - 1e-12 && n <= Math.max(v, t) + 1e-12, 'overshoot');
      v = n;
    }
    close(v, t, 1e-3);
  }
});

test('needle geometry: -52° empty, 0° mid, +52° full scale', () => {
  close(needleDeg(0), -52);
  close(needleDeg(.5), 0);
  close(needleDeg(1), 52);
});

test('knobAngle: compass sanity around the center', () => {
  close(knobAngle(10, 0, 0, 0), 0);    // right
  close(knobAngle(0, 10, 0, 0), 90);   // below (screen y grows down)
  close(knobAngle(-10, 0, 0, 0), 180); // left
  close(knobAngle(0, -10, 0, 0), -90); // above
});

test('knobDelta: small moves pass through, ±180 seam wraps clean', () => {
  close(knobDelta(10, 50), 40);
  close(knobDelta(50, 10), -40);
  close(knobDelta(179, -179), 2);   // crossing the seam clockwise
  close(knobDelta(-179, 179), -2);  // and back
  for (let a = -180; a <= 180; a += 7)
    for (let b = -180; b <= 180; b += 11)
      assert.ok(Math.abs(knobDelta(a, b)) <= 180.000001);
});
