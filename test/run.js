#!/usr/bin/env node
// Headless runner for the in-page test harness (open index.html?test in a browser
// for the same suite). Extracts the app script and runs runTests() under Node.
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const src = html.match(/<script>([\s\S]*)<\/script>/)[1].replace("'use strict';", '');
(0, eval)(src); // sloppy indirect eval so top-level declarations land on globalThis

const results = runTests();
for (const [name, ok] of results) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
const failed = results.filter(r => !r[1]).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
