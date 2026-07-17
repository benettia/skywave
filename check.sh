#!/usr/bin/env bash
# The merge gate. No green, no merge. Ears never gate — file `by-ear` issues.
set -euo pipefail
cd "$(dirname "$0")"

echo '== gate 1: node --test =='
node --test 'test/*.test.js'

echo '== gate 2: playwright smoke =='
npx playwright test smoke

echo '== gate 3: runtime deps =='
node -e 'const d=require("./package.json").dependencies||{};const k=Object.keys(d);
if(k.length){console.error("runtime deps forbidden:",k.join(", "));process.exit(1)}
console.log("dependencies: none — good")'

echo '== gate 4: determinism pin =='
h=$(node test/band-hash.mjs)
pin=$(tr -d '[:space:]' < test/fixtures/band-layout.sha256)
if [ "$h" != "$pin" ]; then
  echo "band hash $h"
  echo "pinned    $pin"
  echo 'generator output changed — intentional? update the pin in the same commit and say so.'
  exit 1
fi
echo "band layout sha256 $h"

echo 'ALL GATES GREEN'
