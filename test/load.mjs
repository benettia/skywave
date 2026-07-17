// Pull the deterministic core out of index.html and run it under Node.
// Sloppy indirect eval so top-level function declarations land on globalThis;
// boot() self-guards on `typeof document`.
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
(0, eval)(html.match(/<script>([\s\S]*)<\/script>/)[1].replace("'use strict';", ''));

const g = globalThis;
export const { mulberry32, morseEncode, morseDecode, morseTiming, schedOn, makeBand, runTests } = g;
