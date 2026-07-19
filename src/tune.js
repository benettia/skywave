// receiver math: everything about "dial vs carrier" a machine can decide.
// offsets in kHz (dial units), beat in Hz. pure — no DOM, no audio.

// the band is 3–30 MHz; the dial stops at the edges
export const clampF = f => Math.min(30000, Math.max(3000, f));

// selectivity: audio falls off quadratically with offset, dead past 4 kHz
export const selectivity = off => { const s = Math.max(0, 1 - Math.abs(off) / 4); return s * s; };

// heterodyne beat: pitch is exactly the offset (1 kHz off dial = 1 kHz tone).
// |·| keeps it continuous through zero-beat — the whistle glides to 0 Hz and
// back up. no step, no click, no sign flip.
export const beatHz = off => Math.abs(off) * 1000;

// heterodyne loudness: scales with carrier strength, fades to nothing as the
// beat climbs out of the passband
export const hetLevel = (s, beat) => s * .28 * Math.max(0, 1 - beat / 3800);

// AGC flavor: the broadband floor ducks as the signal rises
export const noiseFloor = aud => .11 * (1 - .82 * aud);

// BFO gate: morse and RTTY are inaudible carriers until the BFO is switched in
export const audioLevel = (ty, aud, bfo) => (ty === 'm' || ty === 'r') && !bfo ? 0 : aud * .9;
