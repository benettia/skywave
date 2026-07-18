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
- [ ] **M2 signals** — `src/morse.js` + `src/rtty.js`, encoders WITH decoders,
  exact round-trip tests. Real RTTY framing (Baudot, start/stop bits), not
  random bits. Numbers-station script generator (interval melody, five-digit
  groups, repeat, sign-off) as pure data.
- [ ] **M3 receiver core** — `src/tune.js`: strength vs offset and heterodyne
  beat as pure functions — continuous, beat → 0 at zero-beat, no sign flip.
  `src/audio.js` graph (noise floor, carriers, BFO, poisson crackle) as the
  thin shell. Power gesture keeps its soft ramp.
- [ ] **M4 the panel** — dial + fine tune, 7-seg readout, ballistic meter, BFO
  toggle, volume. Matte black, one amber glow. Cold-war equipment, not a synth
  plugin. UI-only changes still survive the smoke.
- [ ] **M5 the logbook** — log button (freq/UTC/id/note), table, plain-text
  DX-log export, seed in URL hash.
