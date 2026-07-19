// morse: encoder, decoder, timing. pure — no DOM, no audio.
export const MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.',
  H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--',
  Z: '--..', 0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....',
  6: '-....', 7: '--...', 8: '---..', 9: '----.' };
const MORSE_R = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

export const morseEncode = txt => txt.trim().toUpperCase().split(/\s+/)
  .map(w => [...w].map(c => MORSE[c] || '').filter(Boolean).join(' ')).join(' / ');
export const morseDecode = pat => pat.split(' / ')
  .map(w => w.split(' ').map(s => MORSE_R[s] || '').join('')).join(' ');

// -> [[onUnits, offUnits], ...]  dit 1, dah 3, intra-letter 1, letter 3, word 7
export function morseTiming(pat) {
  const out = [];
  for (let i = 0; i < pat.length; i++) {
    const c = pat[i];
    if (c !== '.' && c !== '-') continue;
    const n = pat[i + 1];
    let off = 1;
    if (n === undefined) off = 7; else if (n === ' ') off = pat[i + 2] === '/' ? 7 : 3;
    out.push([c === '.' ? 1 : 3, off]);
  }
  return out;
}
