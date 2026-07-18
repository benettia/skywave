// the band: seeded station placement, UTC schedules, propagation. pure — no DOM, no audio.
import { mulberry32 } from './rng.js';

const WORDS = ['MAGPIE', 'ORION', 'VEGA', 'ALTAIR', 'SABLE', 'LYRA', 'QSL QRZ', 'QRT 73',
  'GRID JN45', 'ECHO 9'];

// schedules: a=always, h=hourly minute window [m0,m1), d=daily hour window [h0,h1) which
// may wrap UTC midnight (h0 > h1 means overnight)
export function schedOn(sc, d) {
  if (sc.t === 'a') return true;
  if (sc.t === 'h') { const m = d.getUTCMinutes(); return m >= sc.m0 && m < sc.m1; }
  const h = d.getUTCHours();
  return sc.h0 <= sc.h1 ? (h >= sc.h0 && h < sc.h1) : (h >= sc.h0 || h < sc.h1);
}

// 40 stations, min 15 kHz spacing, 3.05–29.85 MHz. same seed → identical band.
export function makeBand(seed) {
  const r = mulberry32(seed), sts = [];
  const plan = 'n'.repeat(7) + 'm'.repeat(8) + 'r'.repeat(7) + 'c'.repeat(18);
  for (const ty of plan) {
    let f, tries = 0;
    do { f = Math.round((3050 + r() * 26800) * 10) / 10; }
    while (sts.some(s => Math.abs(s.f - f) < 15) && ++tries < 99);
    const st = { ty, f, base: .45 + .55 * r(), fr: .05 + .15 * r(), fp: r() * 6.283, jam: false };
    const x = r();
    if (ty === 'n') st.sc = x < .5 ? { t: 'h', m0: [0, 15, 30, 45][(r() * 4) | 0], m1: 0 }
      : x < .85 ? { t: 'd', h0: 19 + ((r() * 5) | 0), h1: 1 + ((r() * 5) | 0) } : { t: 'a' };
    else if (ty === 'c') st.sc = x < .25 ? { t: 'd', h0: 6 + ((r() * 4) | 0), h1: 16 + ((r() * 6) | 0) } : { t: 'a' };
    else st.sc = x < .3 ? { t: 'h', m0: [0, 20, 40][(r() * 3) | 0], m1: 0 } : { t: 'a' };
    if (st.sc.t === 'h' && !st.sc.m1) st.sc.m1 = st.sc.m0 + 8 + ((r() * 7) | 0);
    if (ty === 'm') {
      const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ', P = 'KWVUX';
      st.cs = P[(r() * 5) | 0] + ((r() * 10) | 0) + A[(r() * 24) | 0] + A[(r() * 24) | 0];
      st.msg = 'VVV DE ' + st.cs + ' ' + WORDS[(r() * WORDS.length) | 0];
    }
    if (ty === 'n') st.vs = r();
    sts.push(st);
  }
  const ns = sts.filter(s => s.ty === 'n');
  let picked = 0;
  while (picked < 4) { const k = ns[(r() * ns.length) | 0]; if (!k.jam) { k.jam = true; picked++; } }
  sts.sort((a, b) => a.f - b.f);
  return sts;
}

// strength = base × propagation × fade, zero off-schedule. low freqs carry at night,
// high by day, blended by local daylight; slow per-station ionospheric fade on top.
export function strength(st, now, t) {
  if (!schedOn(st.sc, now)) return 0;
  const h = now.getHours() + now.getMinutes() / 60;
  const day = Math.max(0, Math.sin((h - 6) / 12 * Math.PI));  // 0 night … 1 midday, local
  const pos = (st.f - 3000) / 27000;                          // 0 low band … 1 high band
  const prop = .35 + .65 * (day * pos + (1 - day) * (1 - pos));
  const fade = .75 + .25 * Math.sin(6.283 * st.fr * t + st.fp);
  return st.base * prop * fade;
}

// nearest station within 6 kHz of the dial, else null
export function nearest(band, f) {
  let best = null, bd = 6;
  for (const s of band) { const d = Math.abs(s.f - f); if (d < bd) { bd = d; best = s; } }
  return best;
}
