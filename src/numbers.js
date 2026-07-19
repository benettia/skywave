// numbers-station script: everything decidable about a transmission, as pure data.
// interval melody → six five-digit groups spoken then repeated → three-tone sign-off.
export const SIGNOFF_HZ = [820, 700, 580];
export const SCALE = [0, 3, 5, 7, 10, 12];      // semitones over 880 Hz — music box
export const beepFreqs = d => [560 + d * 52, 1180 + d * 52];  // two-tone digit fallback

export const intervalMelody = r =>
  Array.from({ length: 5 + ((r() * 3) | 0) }, () => SCALE[(r() * 6) | 0]);

export const digitGroups = (r, n = 6) =>
  Array.from({ length: n }, () => Array.from({ length: 5 }, () => (r() * 10) | 0).join(''));

// one transmission cycle off the station's rng stream: fresh groups, spoken twice
export const numbersScript = r => {
  const groups = digitGroups(r);
  return { groups, spoken: [...groups, ...groups], signoff: SIGNOFF_HZ };
};
