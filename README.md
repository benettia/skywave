# SKYWAVE

A shortwave radio simulator: one `index.html` plus a few pure ES modules. A fictional
band from 3 to 30 MHz, ~40 procedurally generated stations, every sound synthesized
with WebAudio at runtime — no samples, no assets, no network, no dependencies, no build.

The target feeling: 3am, headphones, hunting a numbers station through the static.

**[Listen →](https://benettia.github.io/skywave/)** — or serve it locally (ES modules
need http, not file://): `python3 -m http.server 8080`, open <http://localhost:8080>.
Flip **POWER** (browsers require a gesture before audio), put on headphones, tune slowly.

## The band

The URL hash carries a seed (`#s=123456`). The same seed always produces the same band —
station frequencies, schedules, morse callsigns — so a URL is a shareable net.

What's out there:

- **Numbers stations** — a music-box interval signal, then spoken digit groups
  (via `speechSynthesis`, preferring non-English voices), then sign-off tones.
- **Morse beacons** — 600 Hz keyed CW with standard timing. The callsign and coded
  phrase are real, decodable morse. Bring a pencil.
- **RTTY** — two-tone FSK warble, 1445/1615 Hz at ~45 baud.
- **Jammers** — a harsh swept buzz parked on top of certain numbers stations.
  Draw your own conclusions.
- **Broadcast carriers** — someone very far away is playing music.

The good stations keep schedules in real UTC time — some transmit only in a ten-minute
window each hour, some only at night. Off-window, the frequency is dead air. Low
frequencies carry better at night, high frequencies by day.

## The receiver

- Tuning near a carrier but off-center mixes in a heterodyne beat whistle whose pitch
  glides continuously with the dial, down to zero-beat and back up.
- Morse and RTTY are inaudible carriers until you switch in the **BFO**.
- Signal meter with ballistic needle, AGC-style noise floor, slow ionospheric fading.

| Control | Action |
| --- | --- |
| TUNING dial | drag — ~2.2 MHz per turn |
| FINE knob | drag — ~11 kHz per turn |
| mouse wheel | ±5 kHz (with Shift: ±100 Hz) |
| ← / → | ±1 kHz (with Shift: ±100 Hz) |
| PgUp / PgDn | ±100 kHz |
| LOG / EXPORT | capture freq + UTC + note; export a DX-style plain-text log |

## Tests — the machine gates

`./check.sh` is the merge gate (this is what CI runs). It is exactly:

1. `node --test 'test/*.test.js'` — the pure modules in `src/`: seeded rng and
   splitting, band generation, propagation, morse codec and timing, RTTY baudot
   framing round-trips, numbers-station scripts, UTC schedule windows, boundary
   cases.
2. `npx playwright test smoke` — headless boot: page loads, zero console
   errors, POWER exists, flipping it creates an AudioContext.
3. runtime-deps check — `package.json` dependencies must stay empty. Dev deps only.
4. determinism pin — seed 123456's band hashes to `test/fixtures/band-layout.sha256`.
   Changed the generator on purpose? Update the pin in the same commit and say so.

Setup once: `npm install` (pulls the one dev dep, playwright).

## The listen loop — ears are a feedback channel, not a gate

No CI can hear. Audio behavior (heterodyne glide, morse decodability, the *feel*)
is verified by human ears:

```
python3 -m http.server 8080     # then open http://localhost:8080
```

Anything that sounds wrong → `gh issue create -l by-ear` (create the label once:
`gh label create by-ear -d "heard something wrong"`). Issues feed the next run;
they never block a merge.

Listen checklist:

- **M0** — page boots silent. Flip POWER: static floor fades in with a soft
  ramp, no pop or click. Occasional crackle ticks. Flip it off: audio ramps
  down clean.
- **M1** — pure extraction; nothing may sound different. Open `#s=123456`,
  note three station frequencies and what they are; reload, same three, same
  sounds. A morse beacon still decodes to `VVV DE <callsign> ...` by ear.
- **M2** — park on an RTTY station with the BFO in: the warble now has
  structure — a steady even chatter (that's `RYRYRY`, the alternating test
  pair), pauses on a held high tone between repeats, and the same station
  always keys the same tape. Reload: same tape. A numbers station still runs
  melody → six groups of five → the same six again → three falling tones;
  the beep-fallback digits step audibly in pitch (higher digit, higher pair).
