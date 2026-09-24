#!/usr/bin/env node
import assert from 'node:assert/strict';
import { preservePersistentLiveCountDuringStart } from '../src-next/core/battle/showdown-start-livecount-guard.js';

const side = {
  pokemonLeft: 2,
  pokemon: [
    { hp: 0, fainted: true },
    { hp: 41, fainted: false },
  ],
};

const restore = preservePersistentLiveCountDuringStart(side);
assert.equal(side.pokemonLeft, 1, 'authoritative start must observe the exact hydrated live count');

// Reproduce the pinned Showdown queued start initialization. This is the one
// assignment the boundary guard is allowed to suppress.
side.pokemonLeft = side.pokemon.length;
assert.equal(side.pokemonLeft, 1, 'queued team-length reset must not resurrect persisted fainted party members');

// A later mechanics-owned write must not be swallowed by the guard.
side.pokemonLeft = 0;
assert.equal(side.pokemonLeft, 0, 'non-reset Showdown bookkeeping writes must remain authoritative');

const result = restore();
assert.deepEqual(result, { persistentLive: 1, finalValue: 0, suppressedQueuedReset: true });
assert.equal(side.pokemonLeft, 0, 'restoring the guard must retain the final authoritative value');
side.pokemonLeft = 1;
assert.equal(side.pokemonLeft, 1, 'restoration must return pokemonLeft to an ordinary writable data property');

console.log('Showdown start live-count guard regression PASS');
