// panel math: everything about the front panel a machine can decide.
// 7-seg encoding, readout layout, meter ballistics, knob geometry.
// pure — no DOM, no audio.

// seven-segment truth table, bit order a b c d e f g (bit0 = a = top)
export const SEG = { ' ': 0, 0: 0x3f, 1: 0x06, 2: 0x5b, 3: 0x4f, 4: 0x66,
  5: 0x6d, 6: 0x7d, 7: 0x07, 8: 0x7f, 9: 0x6f };

// fixed 7-char readout "⌴7.1000".."29.8500" — dp always at index 2,
// leading zero blanked (ghost segments, like real hardware)
export const freqText = fk => (fk / 1000).toFixed(4).padStart(7, ' ');
export const freqSegs = fk => [...freqText(fk)].filter(c => c !== '.').map(c => SEG[c]);

// ballistic needle: fast attack, slow decay — one step per animation frame
export const meterStep = (v, target) => v + (target - v) * (target > v ? .35 : .03);
export const needleDeg = v => -52 + 104 * v;

// knob geometry: pointer angle around the knob center, and the wrapped
// per-move delta — no seam when the pointer crosses ±180°
export const knobAngle = (x, y, cx, cy) => Math.atan2(y - cy, x - cx) * 180 / Math.PI;
export const knobDelta = (prev, next) => {
  let d = next - prev; if (d > 180) d -= 360; if (d < -180) d += 360; return d;
};
