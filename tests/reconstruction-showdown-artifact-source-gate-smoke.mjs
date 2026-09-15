import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { inspectPinnedShowdownSource } from '../scripts/prepare-showdown-browser-source.mjs';
import { SHOWDOWN_REVISION } from '../src-next/core/battle/showdown-pin.js';

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim();
}

function fakeUpstream() {
  const root = mkdtempSync(join(tmpdir(), 'mapless-showdown-source-'));
  mkdirSync(join(root, 'sim'), { recursive: true });
  mkdirSync(join(root, 'data'), { recursive: true });
  for (const file of ['battle.ts', 'battle-actions.ts', 'dex.ts', 'prng.ts']) writeFileSync(join(root, 'sim', file), '// fixture\n');
  writeFileSync(join(root, 'LICENSE'), 'MIT License\nPermission is hereby granted, free of charge, to any person obtaining a copy\n');
  git(root, 'init');
  git(root, 'config', 'user.email', 'fixture@example.invalid');
  git(root, 'config', 'user.name', 'fixture');
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'fixture');
  return root;
}

const wrongRevision = fakeUpstream();
assert.throws(() => inspectPinnedShowdownSource(wrongRevision), /revision mismatch/);

// The source gate deliberately requires the exact upstream commit, not merely a source-shaped tree.
// Keep the pin itself guarded here so a future pin change cannot silently float.
assert.equal(SHOWDOWN_REVISION, 'b1156ff19204e48089e2384eb2c9c1a8004f57ce');

console.log('reconstruction Showdown artifact source gate smoke: ok');
