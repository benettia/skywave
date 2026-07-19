// deploy completeness: everything index.html reaches at runtime must be in the
// gh-pages copy list in ci.yml. The smoke test boots the checkout, not the deployed
// artifact — this is the gate that was missing when the ES-module split shipped an
// index.html whose src/ imports 404'd on the live site.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p), 'utf8');

// relative specifiers in static or dynamic imports: from './x.js', import './x.js', import('./x.js')
const SPEC = /(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g;

// index.html plus every transitively imported module, repo-relative
function runtimeFiles() {
  const files = new Set(['index.html']);
  const queue = [...read('index.html').matchAll(SPEC)].map(m => normalize(m[1]));
  while (queue.length) {
    const f = queue.pop();
    if (files.has(f)) continue;
    files.add(f);
    for (const m of read(f).matchAll(SPEC)) queue.push(normalize(join(dirname(f), m[1])));
  }
  return [...files].sort();
}

// the copy list: `cp <src> /tmp/site...` lines in the deploy job
function deployedPrefixes() {
  return [...read('.github/workflows/ci.yml').matchAll(/^\s*cp\s+(?:-r\s+)?(\S+)\s+\/tmp\/site/gm)]
    .map(m => m[1]);
}

test('every import in the runtime graph resolves to a real file', () => {
  for (const f of runtimeFiles()) assert.ok(existsSync(join(root, f)), `${f} does not exist`);
});

test('the graph walk actually sees the modules (guard against regex rot)', () => {
  const files = runtimeFiles();
  assert.ok(files.length >= 8, `only found ${files.length} runtime files: ${files.join(', ')}`);
  assert.ok(files.includes('src/rng.js'));
  assert.ok(files.includes('src/morse.js')); // reached only transitively, via src/audio.js
});

test('ci.yml deploy step has a parseable copy list', () => {
  const prefixes = deployedPrefixes();
  assert.ok(prefixes.includes('index.html'), `copy list: ${prefixes.join(', ')}`);
});

test('every runtime file is shipped by the deploy copy list', () => {
  const prefixes = deployedPrefixes();
  for (const f of runtimeFiles()) {
    const shipped = prefixes.some(p => f === p || f.startsWith(p + '/'));
    assert.ok(shipped, `${f} is imported at runtime but not in the ci.yml deploy copy list`);
  }
});
