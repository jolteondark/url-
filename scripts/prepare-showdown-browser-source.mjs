import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHOWDOWN_REVISION, SHOWDOWN_REPOSITORY, SHOWDOWN_LICENSE } from '../src-next/core/battle/showdown-pin.js';

const REQUIRED_SOURCE = [
  'sim/battle.ts',
  'sim/battle-actions.ts',
  'sim/dex.ts',
  'sim/prng.ts',
  'data',
];

export function inspectPinnedShowdownSource(upstreamDir) {
  const root = resolve(upstreamDir);
  const revision = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (revision !== SHOWDOWN_REVISION) {
    throw new Error(`Showdown source revision mismatch: expected ${SHOWDOWN_REVISION}, got ${revision}`);
  }
  for (const relative of REQUIRED_SOURCE) {
    if (!existsSync(join(root, relative))) throw new Error(`Pinned Showdown source missing ${relative}`);
  }
  const licensePath = join(root, 'LICENSE');
  if (!existsSync(licensePath)) throw new Error('Pinned Showdown source missing LICENSE');
  const license = readFileSync(licensePath, 'utf8');
  if (!/Permission is hereby granted, free of charge/.test(license)) {
    throw new Error('Pinned Showdown LICENSE does not contain the expected MIT permission notice');
  }
  return Object.freeze({
    repository: SHOWDOWN_REPOSITORY,
    revision: SHOWDOWN_REVISION,
    license: SHOWDOWN_LICENSE,
    entry: 'sim/battle.ts',
    dataRoot: 'data',
  });
}

export function writePinnedShowdownSourceManifest(upstreamDir, outputFile) {
  const manifest = inspectPinnedShowdownSource(upstreamDir);
  const output = resolve(outputFile);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const upstreamDir = process.argv[2];
  const outputFile = process.argv[3] || 'vendor/showdown/source-manifest.json';
  if (!upstreamDir) {
    console.error('usage: node scripts/prepare-showdown-browser-source.mjs <pinned-pokemon-showdown-checkout> [manifest-output]');
    process.exit(2);
  }
  const manifest = writePinnedShowdownSourceManifest(upstreamDir, outputFile);
  console.log(`accepted ${manifest.repository}@${manifest.revision}; browser artifact entry=${manifest.entry}`);
}
