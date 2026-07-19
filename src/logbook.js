// the logbook: everything about logging a machine can decide.
// id honesty rule, zulu clock, entry shape, table rows, DX-log text, seed-in-hash.
// pure — no DOM, no audio, no Date.now.

export const NAMES = { n: 'numbers stn', m: 'morse beacon', r: 'rtty/data', c: 'broadcast' };

// honesty rule (spec): claim an id only when the audible signal is strong
// enough to honestly hear what it is — else "unid". threshold pinned.
export const claimId = (st, aud) =>
  st && aud > .18 ? NAMES[st.ty] + (st.jam ? ' + jammer' : '') : 'unid';

export const zulu = d => String(d.getUTCHours()).padStart(2, '0')
  + String(d.getUTCMinutes()).padStart(2, '0') + 'z';
export const zdate = d => d.toISOString().slice(0, 10);

export const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export const makeEntry = (fk, d, id, note) =>
  ({ d: zdate(d), z: zulu(d), f: (fk / 1000).toFixed(4), id, note: note.trim() });

// newest entry on top, like a paper log left open at today
export const tableHtml = logs => logs.map(l =>
  `<tr><td>${l.z}</td><td>${l.f} MHz</td><td>${l.id}</td><td>${esc(l.note)}</td></tr>`)
  .reverse().join('');

// plain-text DX-style log: header names the net (seed), one line per entry
export const exportText = (logs, seed) =>
  [`SKYWAVE SW-1 DX LOG — NET ${seed}`, '', ...logs.map(l =>
    `${l.d} ${l.z} ${l.f} MHz — ${[l.id, l.note].filter(Boolean).join(', ')}`)]
  .join('\n') + '\n';

// seed from the URL hash (#s=123456); null means roll a new net
export const parseSeed = hash => { const m = /s=(\d+)/.exec(hash); return m ? +m[1] : null; };
