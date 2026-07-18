# SKYWAVE — product spec

This file is the source of truth. If code and spec disagree, one of them is a bug;
decide which, fix it, and keep them in sync in the same PR.

## What it is

A shortwave radio simulator. A fictional band from 3 to 30 MHz, ~40 procedurally
generated stations, every sound synthesized with WebAudio at runtime. The target
feeling: 3am, headphones, hunting a numbers station through the static.

Hard constraints, non-negotiable:

- One `index.html` plus a handful of pure ES modules under `src/`.
- No samples, no assets, no network calls, no framework, no runtime dependencies.
  `package.json` "dependencies" is empty or absent, forever. Dev deps only
  (playwright is the one dev dep).
- Line budget ~1200 across `src/` + `index.html`. Over budget is when deleting
  would hurt, not before.

## The band

Seeded by the URL hash (`#s=123456`). Same seed → identical band: frequencies,
schedules, callsigns, jammer placement. A URL is a shareable net.

Station plan per band (40 stations, min 15 kHz spacing, 3.05–29.85 MHz):

- **7 numbers stations** — interval melody (music box), spoken five-digit groups
  (speechSynthesis, preferring non-English voices; two-tone beep fallback),
  groups repeated once, three-tone sign-off. Four of the seven carry a jammer:
  a harsh swept buzz parked on top. Draw your own conclusions.
- **8 morse beacons** — 600 Hz keyed CW. Callsign (prefix K/W/V/U/X + digit +
  two letters) and a coded phrase, real decodable morse, standard timing:
  dit 1, dah 3, intra-letter gap 1, letter gap 3, word gap 7.
- **7 RTTY stations** — two-tone FSK warble, 1445/1615 Hz, ~45 baud.
- **18 broadcast carriers** — someone very far away is playing music
  (low-passed pentatonic, sparse).

Schedules run in real UTC. Types: always-on; hourly window (start minute
0/15/30/45-ish, 8–15 min long); daily window in hours, which may cross UTC
midnight (e.g. 22–04) and must handle the wrap. Off-window is dead air.

Propagation: low frequencies carry better at night, high frequencies by day,
blended by local daylight; on top, slow per-station ionospheric fading
(~0.05–0.2 Hz sine). Strength = base × propagation × fade, zero off-schedule.

## The receiver

- Tuning: coarse dial ~2.2 MHz/turn, fine knob ~11 kHz/turn, wheel ±5 kHz
  (Shift ±100 Hz), arrows ±1 kHz (Shift ±100 Hz), PgUp/PgDn ±100 kHz.
  Clamped to 3–30 MHz.
- Heterodyne: tuning near a carrier but off-center mixes in a beat whistle at
  exactly the offset frequency (1 kHz off dial = 1 kHz tone). The pitch glides
  continuously with the dial — down to zero-beat and back up. No steps, no
  clicks, no sign flip at zero.
- Selectivity: audio level falls off with offset (quadratic, ~4 kHz half-width).
- BFO: morse and RTTY are inaudible carriers until the BFO is switched in.
- Noise: broadband floor with AGC flavor (floor ducks as signal rises), poisson
  crackle. Band-limited voice-ish passband (300–3200 Hz) on the whole bus.
- Power: browsers require a gesture; POWER flips the AudioContext on with a soft
  gain ramp — no pop. Off ramps down and suspends.
- Signal meter with ballistic needle: fast attack, slow decay.

## The panel

Cold-war equipment, not a synth plugin. Matte black, one amber glow. 7-seg-style
frequency readout in MHz, UTC clock, SIGNAL meter, TUNING + FINE + AF GAIN knobs,
POWER and BFO toggle switches with LEDs.

## The logbook

LOG captures freq / UTC / best-guess id / free note into a table; EXPORT writes a
plain-text DX-style log. Station id only when signal is strong enough to honestly
claim it, else "unid".

## Architecture doctrine

Half the app is sound, and no CI can hear. Deal with it by construction:

- Everything decidable lives in pure, DOM-free, AudioContext-free modules:
  rng (seeded, splittable), band (placement, schedules, propagation), morse and
  rtty (encoders WITH decoders, round-trip exact), tune (strength and beat
  frequency as pure functions of dial offset). Fully testable under `node --test`.
  If logic can be pulled out of the audio graph into a pure module, it must be.
  (M1 extracted rng, band, and morse into `src/`; M2–M3 extract the rest.)
- `src/audio.js` and `index.html` are the thin shell: wire pure outputs to
  oscillators and the DOM. The shell gets a headless boot smoke: page loads,
  zero console errors, POWER exists, flipping it creates an AudioContext.
  That is all a machine can know about sound; don't pretend it can know more.
- Ears are a feedback channel, never a merge gate. Merges ride on `./check.sh`.
  What a human hears becomes a `by-ear` issue, and issues feed the next run.

## The gates (`./check.sh`)

1. `node --test test/` — green or dead.
2. `npx playwright test smoke` — boots clean, zero console errors.
3. Runtime-deps check — `package.json` dependencies empty or absent.
4. Determinism pin — fixed seed 123456 → sha256 of the generated band matches
   `test/fixtures/band-layout.sha256`. Changing the generator on purpose means
   updating the pin in the same commit and saying so in the body.

No green, no merge.

## Milestones

See ROADMAP.md. One milestone per run, merged by machine gates alone.
