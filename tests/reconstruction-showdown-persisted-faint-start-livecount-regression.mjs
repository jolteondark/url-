#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const sourcePath = fileURLToPath(new URL('../src-next/core/battle/showdown-stream-session.js', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');

// The persisted live count is mechanics-visible during authoritative start
// (for example to format/rule onBegin hooks).  A zero sentinel avoids pinned
// Showdown's queued `if (side.pokemonLeft) ...` reset, but it also lies to any
// Showdown mechanics that inspect pokemonLeft before the adapter's post-start
// reconciliation.  Keep the exact hydrated live count observable throughout
// authoritative start; suppress only the queued team-length overwrite.
assert.doesNotMatch(
  source,
  /function suppressShowdownStartPartyReset\([\s\S]*?side\.pokemonLeft\s*=\s*0\s*;/,
  'authoritative Showdown start must never observe a synthetic zero live-party count',
);
assert.match(
  source,
  /function preservePersistentLiveCountDuringStart\(/,
  'persistent live-party count needs a start-scoped guard instead of a zero sentinel',
);
assert.match(
  source,
  /preservePersistentLiveCountDuringStart\(battle,[\s\S]*?authoritativeStart\.call\(battle\)/,
  'the live-count guard must cover the authoritative Showdown start call itself',
);

console.log('persisted-faint Showdown start live-count regression PASS');
