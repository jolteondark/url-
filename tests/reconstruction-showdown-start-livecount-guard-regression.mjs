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
// assignment the boundary guard is allowed to suppress when it would resurrect
// a persisted fainted member.
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

// An all-live party has no persistent-faint incompatibility. Do not classify
// Showdown's ordinary team-length initialization as an adapter-suppressed write.
const healthySide = {
  pokemonLeft: 2,
  pokemon: [
    { hp: 37, fainted: false },
    { hp: 41, fainted: false },
  ],
};
const restoreHealthy = preservePersistentLiveCountDuringStart(healthySide);
healthySide.pokemonLeft = healthySide.pokemon.length;
assert.equal(healthySide.pokemonLeft, 2, 'all-live party must retain Showdown team-length bookkeeping');
assert.deepEqual(
  restoreHealthy(),
  { persistentLive: 2, finalValue: 2, suppressedQueuedReset: false },
  'guard must report no suppression when the queued initialization is already correct',
);

// This adapter exception is deliberately tied to the pinned Showdown start
// behavior. If that revision no longer emits the team-length initialization,
// fail closed instead of silently carrying a stale compatibility shim.
const missingResetSide = {
  pokemonLeft: 2,
  pokemon: [
    { hp: 0, fainted: true },
    { hp: 41, fainted: false },
  ],
};
const restoreMissingReset = preservePersistentLiveCountDuringStart(missingResetSide);
assert.equal(missingResetSide.pokemonLeft, 1);
assert.throws(
  () => restoreMissingReset(),
  /did not perform the expected pokemonLeft team-length initialization/,
  'persisted-faint compatibility guard must fail if the pinned start contract is not observed',
);
assert.equal(missingResetSide.pokemonLeft, 1, 'failed contract verification must still restore an ordinary data property');
missingResetSide.pokemonLeft = 0;
assert.equal(missingResetSide.pokemonLeft, 0, 'failed contract verification must not leak the accessor guard');

console.log('Showdown start live-count guard regression PASS');
