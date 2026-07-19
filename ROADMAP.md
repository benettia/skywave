# ROADMAP

One milestone per run. Merge rides on `./check.sh` (node --test, playwright
smoke, zero runtime deps, pinned determinism hash). Ears file `by-ear` issues;
they feed the next run, they never gate a merge. SPEC.md is the source of truth.

The app began life as a working single-file monolith; M1–M5 pull its logic out
into pure `src/` modules with real tests, closing spec gaps as they go.

- [x] **M0 scaffold** — package.json (dev deps only), `node --test` suite
  wrapping the deterministic core, playwright boot smoke, `check.sh` running all
  four gates, determinism pin in test/fixtures, README listen loop.
- [x] **M1 the band** — extract `src/rng.js` (seeded, splittable) +
  `src/band.js` (placement, schedules, propagation curves) as pure ES modules.
  Boundary tests: windows across UTC midnight, band edges, spacing. Pin moves
  with the extraction only if byte-identical output is impossible; say so.
  (Extraction came out byte-identical — pin unchanged. `src/morse.js` moved
  too, verbatim: the module conversion killed the eval-based test loader, so
  everything the tests touch had to become importable. M2 still owes RTTY
  framing, the numbers-script generator, and any morse gaps.)
- [x] **M2 signals** — `src/morse.js` + `src/rtty.js`, encoders WITH decoders,
  exact round-trip tests. Real RTTY framing (Baudot, start/stop bits), not
  random bits. Numbers-station script generator (interval melody, five-digit
  groups, repeat, sign-off) as pure data.
  (RTTY is real ITA2 now: start + 5 data + 2 stop at 45.45 baud, and each
  station keys a deterministic tape — `RYRYRY … DE <cs> MSG NR <grp> = …` —
  off its split rng stream. Numbers scripts moved to `src/numbers.js`, same
  data the shell used to improvise inline. `makeBand` untouched, pin
  unchanged.)
- [x] **M3 receiver core** — `src/tune.js`: strength vs offset and heterodyne
  beat as pure functions — continuous, beat → 0 at zero-beat, no sign flip.
  `src/audio.js` graph (noise floor, carriers, BFO, poisson crackle) as the
  thin shell. Power gesture keeps its soft ramp.
  (Pure extraction, coefficients unchanged: selectivity, beat, het loudness,
  AGC floor, and the BFO gate moved out of the frame loop into `src/tune.js`;
  the whole audio graph moved into `src/audio.js` behind a five-call surface —
  power / retune / apply / setVol / now. index.html now only owns panel state
  and pushes tune.js outputs into the graph each frame. Pin unchanged.)
- [x] **M4 the panel** — dial + fine tune, 7-seg readout, ballistic meter, BFO
  toggle, volume. Matte black, one amber glow. Cold-war equipment, not a synth
  plugin. UI-only changes still survive the smoke.
  (The panel hardware existed since the monolith; M4 made the readout true
  seven-segment — six digit cells, ghost segments, blanked leading zero, fixed
  dp — and pulled the decidable panel math into pure `src/panel.js`: the SEG
  truth table, readout layout, meter attack/decay, knob angle + wrap-seam
  delta. The shell renders masks; the numbers live under `node --test` now.
  Pin unchanged.)
- [x] **M5 the logbook** — log button (freq/UTC/id/note), table, plain-text
  DX-log export, seed in URL hash.
  (The hardware existed since the monolith; M5 pulled the decidable half into
  pure `src/logbook.js`: the .18 id-honesty threshold, zulu/zdate, entry shape,
  escaped table rows newest-first, DX-log text, and seed-in-hash parsing — all
  pinned byte-exact under `node --test`. The export grew a `NET <seed>` header
  and UTC dates per line; the shell keeps only the DOM and the Blob download.
  Pin unchanged.)
