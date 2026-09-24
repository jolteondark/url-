#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const sourcePath = fileURLToPath(new URL('../src-next/core/battle/showdown-stream-session.js', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');

// Pinned Showdown's queued `start` action executes
// `if (side.pokemonLeft) side.pokemonLeft = side.pokemon.length`.
// A persisted fainted party therefore cannot expose its hydrated nonzero live
// count while authoritative start runs: Showdown would transiently resurrect
// the bench in live-party bookkeeping before the adapter repairs the count.
// Suppress only that initialization sentinel before authoritative start, then
// restore the exact persistent live count after Showdown-owned initial switch-in.
assert.match(
  source,
  /function preparePersistentSideBookkeeping\([\s\S]*?side\.pokemonLeft\s*=\s*0\s*;/,
  'persistent faint projection must suppress Showdown start live-count reset before authoritative start',
);
assert.match(
  source,
  /preparePersistentSideBookkeeping\(battle,\s*0\)[\s\S]*?preparePersistentSideBookkeeping\(battle,\s*1\)[\s\S]*?authoritativeStart\.call\(battle\)[\s\S]*?reconcilePersistentSideBookkeeping\(battle,\s*0\)[\s\S]*?reconcilePersistentSideBookkeeping\(battle,\s*1\)/,
  'bookkeeping suppression must bracket authoritative Showdown start and be reconciled afterward',
);

console.log('persisted-faint Showdown start-reset regression PASS');
