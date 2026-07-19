// rtty: real ITA2 baudot framing over two-tone FSK. encoder WITH decoder. pure.
// frame per code: start bit (space), 5 data bits LSB-first, 2 stop bits (mark).
export const BAUD = 45.45, UNIT = 1 / BAUD;    // seconds per bit
export const SPACE_HZ = 1445, MARK_HZ = 1615;
export const freqOf = bit => bit ? MARK_HZ : SPACE_HZ;

// ITA2, national positions filled US-style, '=' at 30. \x1b=FIGS(27) \x1f=LTRS(31).
const LTRS = '\x00E\nA SIU\rDRJNFCKTZLWHYPQOBG\x1bMXV\x1f';
const FIGS = "\x003\n- '87\r\x054\x07,!:(5\")2#6019?&\x1b./=\x1f";

export function rttyEncode(text) {
  const bits = [];
  const push = c => bits.push(0, c & 1, c >> 1 & 1, c >> 2 & 1, c >> 3 & 1, c >> 4 & 1, 1, 1);
  let shift = LTRS;
  for (const ch of text.toUpperCase()) {
    let c = shift.indexOf(ch);
    if (c < 0) {
      const other = shift === LTRS ? FIGS : LTRS;
      c = other.indexOf(ch);
      if (c < 0) continue;                       // unencodable: drop it
      push(shift === LTRS ? 27 : 31);
      shift = other;
    }
    push(c);
  }
  return bits;
}

// hunts start bits, so leading/trailing mark idle is fine
export function rttyDecode(bits) {
  let out = '', shift = LTRS, i = 0;
  while (i + 5 < bits.length) {
    if (bits[i] !== 0) { i++; continue; }
    let c = 0;
    for (let b = 0; b < 5; b++) c |= bits[i + 1 + b] << b;
    i += 8;
    if (c === 27) shift = FIGS;
    else if (c === 31) shift = LTRS;
    else out += shift[c];
  }
  return out;
}

// station traffic: classic test tape + a coded telegram. same rng stream → same tape.
export function rttyText(r) {
  const cs = 'RNKM'[(r() * 4) | 0] + 'DFGV'[(r() * 4) | 0] + ((10 + r() * 90) | 0);
  const grp = () => Array.from({ length: 5 }, () => (r() * 10) | 0).join('');
  return `RYRYRY RYRYRY DE ${cs} ${cs} MSG NR ${grp()} = ${grp()} ${grp()} ${grp()} = AR`;
}
