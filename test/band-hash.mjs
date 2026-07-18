// Determinism pin: sha256 over the full band for a fixed seed.
// Gate 4 of check.sh runs this file directly and compares against
// test/fixtures/band-layout.sha256. Regenerate: node test/band-hash.mjs
import { createHash } from 'node:crypto';
import { makeBand } from '../src/band.js';

export const PIN_SEED = 123456;
export const bandHash = () =>
  createHash('sha256').update(JSON.stringify(makeBand(PIN_SEED))).digest('hex');

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(bandHash());
