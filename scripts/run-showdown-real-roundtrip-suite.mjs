#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { PKMN_PS_REVISION } from './showdown-browser-extractor-plan.mjs';
import { SHOWDOWN_BROWSER_ENTRY } from './showdown-browser-artifact-contract.mjs';
import { SHOWDOWN_REVISION } from '../src-next/core/battle/showdown-pin.js';

const extractorDir = process.argv[2];
if (!extractorDir) {
  console.error('usage: node scripts/run-showdown-real-roundtrip-suite.mjs <built-pinned-pkmn-ps-checkout>');
  process.exit(2);
}

const pinnedExtractor = resolve(extractorDir);
const builtEntry = join(pinnedExtractor, 'sim', SHOWDOWN_BROWSER_ENTRY);
const artifactStamp = join(pinnedExtractor, 'sim', '.mapless-showdown-build.json');

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function verifyPinnedArtifact() {
  if (!existsSync(builtEntry)) throw new Error(`missing pinned Showdown entry: ${builtEntry}`);
  if (!existsSync(artifactStamp)) throw new Error(`missing pinned Showdown provenance stamp: ${artifactStamp}`);
  let stamp;
  try {
    stamp = JSON.parse(readFileSync(artifactStamp, 'utf8'));
  } catch (error) {
    throw new Error(`invalid pinned Showdown provenance stamp: ${error.message}`);
  }
  if (stamp.extractorRevision !== PKMN_PS_REVISION) {
    throw new Error(`wrong pkmn/ps extractor revision: ${stamp.extractorRevision ?? '<missing>'}`);
  }
  if (stamp.showdownRevision !== SHOWDOWN_REVISION) {
    throw new Error(`wrong Pokemon Showdown revision: ${stamp.showdownRevision ?? '<missing>'}`);
  }
  const digest = sha256(builtEntry);
  if (typeof stamp.entrySha256 !== 'string' || stamp.entrySha256 !== digest) {
    throw new Error('pinned Showdown entry digest does not match its build provenance stamp');
  }
}

verifyPinnedArtifact();
console.log(`[showdown-real] verified pinned artifact ${SHOWDOWN_REVISION}`);

const harnesses = [
  'tests/reconstruction-showdown-real-request-differential.mjs',
  'tests/reconstruction-showdown-real-roundtrip.mjs',
  'tests/reconstruction-showdown-real-sleep-roundtrip.mjs',
  'tests/reconstruction-showdown-real-base-moves-persistence.mjs',
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

console.log('\n[showdown-real] PASS request differential + general round-trip + Sleep round-trip + base moves persistence');
