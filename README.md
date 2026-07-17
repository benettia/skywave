# SKYWAVE

A shortwave radio simulator in a single HTML file. A fictional band from 3 to 30 MHz,
~40 procedurally generated stations, every sound synthesized with WebAudio at runtime —
no samples, no assets, no network, no dependencies, no build.

The target feeling: 3am, headphones, hunting a numbers station through the static.

**[Listen →](https://benettia.github.io/skywave/)** — or just open `index.html` from disk.
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

## Tests

The deterministic core (band generation, morse codec and timing, UTC schedule windows)
has a framework-free test harness:

- in a browser: open [`index.html?test`](https://benettia.github.io/skywave/?test) —
  results print above the panel
- headless: `node test/run.js` (this is what CI runs)

Audio behavior (heterodyne glide, morse decodability) is verified by ear.
