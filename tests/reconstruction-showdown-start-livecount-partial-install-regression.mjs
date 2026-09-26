import assert from 'node:assert/strict';
import { runAuthoritativeStartWithPersistentLiveCounts } from '../src-next/core/battle/showdown-start-livecount-guard.js';

const p1 = {
  pokemon: [
    { hp: 20, fainted: false },
    { hp: 0, fainted: true },
  ],
  pokemonLeft: 1,
};
const p2 = {
  pokemon: [{ hp: 20, fainted: false }],
};
Object.defineProperty(p2, 'pokemonLeft', {
  configurable: false,
  enumerable: true,
  writable: true,
  value: 1,
});

const originalP1Descriptor = Object.getOwnPropertyDescriptor(p1, 'pokemonLeft');
let startCalls = 0;
assert.throws(
  () => runAuthoritativeStartWithPersistentLiveCounts({ sides: [p1, p2] }, () => { startCalls += 1; }),
  /configurable data property/,
  'a later-side guard installation failure must fail closed',
);
assert.equal(startCalls, 0, 'authoritative start must not run after partial guard installation failure');
const restoredP1Descriptor = Object.getOwnPropertyDescriptor(p1, 'pokemonLeft');
assert.equal(typeof restoredP1Descriptor.get, 'undefined', 'earlier side must not leak a guard accessor');
assert.equal(typeof restoredP1Descriptor.set, 'undefined', 'earlier side must not leak a guard accessor');
assert.equal(restoredP1Descriptor.configurable, originalP1Descriptor.configurable);
assert.equal(restoredP1Descriptor.writable, originalP1Descriptor.writable);
assert.equal(p1.pokemonLeft, 1, 'earlier side must retain its exact hydrated live count');

// If authoritative start itself throws before the pinned team-length reset is
// observed, restoration also detects a compatibility-contract failure. Preserve
// both failures: otherwise the start exception masks the guard evidence needed
// to diagnose a pinned-engine incompatibility.
const startFailure = new Error('synthetic authoritative start failure');
const guardedSide = {
  pokemon: [
    { hp: 20, fainted: false },
    { hp: 0, fainted: true },
  ],
  pokemonLeft: 1,
};
let combined;
try {
  runAuthoritativeStartWithPersistentLiveCounts({ sides: [guardedSide] }, () => { throw startFailure; });
} catch (error) {
  combined = error;
}
assert.ok(combined instanceof AggregateError, 'simultaneous start/restoration failure must preserve both errors');
assert.equal(combined.errors[0], startFailure, 'original Showdown start failure must remain first');
assert.match(combined.errors[1]?.message ?? '', /did not perform the expected pokemonLeft team-length initialization/);
assert.equal(guardedSide.pokemonLeft, 1, 'combined failure must still restore ordinary pokemonLeft state');
const combinedDescriptor = Object.getOwnPropertyDescriptor(guardedSide, 'pokemonLeft');
assert.equal(typeof combinedDescriptor.get, 'undefined', 'combined failure must not leak a guard accessor');
assert.equal(typeof combinedDescriptor.set, 'undefined', 'combined failure must not leak a guard accessor');

console.log('reconstruction-showdown-start-livecount-partial-install-regression: ok');
