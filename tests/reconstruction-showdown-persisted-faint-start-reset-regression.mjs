#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const sourcePath = fileURLToPath(new URL('../src-next/core/battle/showdown-stream-session.js', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');
const guard = readFileSync(new URL('../src-next/core/battle/showdown-start-livecount-guard.js', import.meta.url), 'utf8');

// Pinned Showdown's queued `start` action executes
// `if (side.pokemonLeft) side.pokemonLeft = side.pokemon.length`.
// Persisted faint state must therefore guard that one initialization overwrite
// without exposing a synthetic zero count to Showdown mechanics. The guard is
// start-scoped, then ordinary writable pokemonLeft state is restored and the
// hydrated count is reconciled after Showdown-owned initial switch-in.
assert.doesNotMatch(
  source,
  /function suppressShowdownStartPartyReset\([\s\S]*?side\.pokemonLeft\s*=\s*0\s*;/,
  'persistent faint projection must not use a zero pokemonLeft sentinel',
);
assert.match(
  guard,
  /function preservePersistentLiveCountDuringStart\([\s\S]*?Number\(value\)\s*===\s*teamLength[\s\S]*?Object\.defineProperty\(side, 'pokemonLeft', \{ \.\.\.descriptor, value: finalValue \}\)/,
  'persistent faint projection must guard only the queued team-length overwrite during authoritative start',
);
assert.match(
  source,
  /runAuthoritativeStartWithPersistentLiveCounts\(battle,\s*authoritativeStart\)[\s\S]*?reconcilePersistentSideBookkeeping\(battle,\s*0\)[\s\S]*?reconcilePersistentSideBookkeeping\(battle,\s*1\)/,
  'the start-scoped guard must be followed by exact persistent live-count reconciliation',
);

console.log('persisted-faint Showdown start-reset regression PASS');
