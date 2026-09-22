#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';

const extractorDir = process.argv[2];
if (!extractorDir) {
  console.error('usage: node scripts/run-showdown-real-roundtrip-suite.mjs <built-pinned-pkmn-ps-checkout>');
  process.exit(2);
}

const pinnedExtractor = resolve(extractorDir);
const harnesses = [
  'tests/reconstruction-showdown-real-request-differential.mjs',
  'tests/reconstruction-showdown-real-roundtrip.mjs',
  'tests/reconstruction-showdown-real-sleep-roundtrip.mjs',
];

for (const harness of harnesses) {
  console.log(`\n[showdown-real] ${harness}`);
  const result = spawnSync(process.execPath, [harness, pinnedExtractor], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(`[showdown-real] FAIL ${harness} (${result.status ?? 'signal'})`);
    process.exit(result.status ?? 1);
  }
}

console.log('\n[showdown-real] PASS request differential + general round-trip + Sleep round-trip');
