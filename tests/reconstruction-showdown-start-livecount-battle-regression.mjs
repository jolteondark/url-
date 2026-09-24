#!/usr/bin/env node
import assert from 'node:assert/strict';
import { runAuthoritativeStartWithPersistentLiveCounts } from '../src-next/core/battle/showdown-start-livecount-guard.js';

function side(hp) {
  return {
    pokemonLeft: hp.length,
    pokemon: hp.map((value) => ({ hp: value, fainted: value === 0 })),
  };
}

const p1 = side([0, 41]);
const p2 = side([53, 0, 67]);
const battle = { sides: [p1, p2] };
let starts = 0;
runAuthoritativeStartWithPersistentLiveCounts(battle, function pinnedStartShape() {
  starts += 1;
  assert.equal(this, battle, 'authoritative start must retain the Showdown Battle receiver');
  assert.equal(p1.pokemonLeft, 1, 'p1 start mechanics must observe hydrated live count');
  assert.equal(p2.pokemonLeft, 2, 'p2 start mechanics must observe hydrated live count');

  // Reproduce the pinned queued start initialization for both sides.
  p1.pokemonLeft = p1.pokemon.length;
  p2.pokemonLeft = p2.pokemon.length;
  assert.equal(p1.pokemonLeft, 1, 'p1 queued reset must be suppressed');
  assert.equal(p2.pokemonLeft, 2, 'p2 queued reset must be suppressed');

  // Subsequent mechanics-owned bookkeeping must remain authoritative.
  p1.pokemonLeft = 0;
  p2.pokemonLeft = 1;
});
assert.equal(starts, 1, 'authoritative Showdown start must run exactly once');
assert.equal(p1.pokemonLeft, 0);
assert.equal(p2.pokemonLeft, 1);
p1.pokemonLeft = 1;
p2.pokemonLeft = 2;
assert.equal(p1.pokemonLeft, 1, 'p1 accessor must be removed after start');
assert.equal(p2.pokemonLeft, 2, 'p2 accessor must be removed after start');

// A thrown authoritative start must restore both side descriptors before the
// original Showdown error escapes. Emit the pinned reset first so restoration
// verifies the expected compatibility contract rather than masking that error.
const thrownP1 = side([0, 20]);
const thrownP2 = side([30, 0]);
const thrownBattle = { sides: [thrownP1, thrownP2] };
const engineError = new Error('synthetic pinned start failure');
assert.throws(
  () => runAuthoritativeStartWithPersistentLiveCounts(thrownBattle, function failingStart() {
    thrownP1.pokemonLeft = thrownP1.pokemon.length;
    thrownP2.pokemonLeft = thrownP2.pokemon.length;
    throw engineError;
  }),
  (error) => error === engineError,
  'the original authoritative Showdown error must escape when guard restoration succeeds',
);
thrownP1.pokemonLeft = 1;
thrownP2.pokemonLeft = 1;
assert.equal(thrownP1.pokemonLeft, 1, 'p1 must be writable after thrown start');
assert.equal(thrownP2.pokemonLeft, 1, 'p2 must be writable after thrown start');

console.log('Showdown battle-scoped start live-count regression PASS');
