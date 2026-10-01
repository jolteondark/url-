import assert from 'node:assert/strict';
import { projectMaplessPokemonToShowdown } from '../src-next/core/battle/showdown-roundtrip.js';

function member(overrides = {}) {
  return {
    id: 'starter-1',
    species: 'Pikachu',
    hp: 35,
    maxhp: 35,
    status: '',
    heldItem: '',
    moves: [{ id: 'thunderbolt', pp: 15, maxpp: 15 }],
    ...overrides,
  };
}

const alive = projectMaplessPokemonToShowdown(member({ hp: 35, fainted: false }));
assert.equal(alive.hp, 35);
assert.equal(alive.fainted, false);

const fainted = projectMaplessPokemonToShowdown(member({ hp: 0, fainted: true }));
assert.equal(fainted.hp, 0);
assert.equal(fainted.fainted, true);

const legacyAlive = projectMaplessPokemonToShowdown(member({ hp: 35 }));
assert.equal(legacyAlive.fainted, false, 'missing persisted faint flag derives exactly from HP for compatibility');
const legacyFainted = projectMaplessPokemonToShowdown(member({ hp: 0 }));
assert.equal(legacyFainted.fainted, true, 'missing persisted faint flag derives exactly from zero HP for compatibility');

assert.throws(
  () => projectMaplessPokemonToShowdown(member({ hp: 0, fainted: false })),
  /faint state is inconsistent with persistent HP/,
  'zero HP must not project as non-fainted',
);
assert.throws(
  () => projectMaplessPokemonToShowdown(member({ hp: 35, fainted: true })),
  /faint state is inconsistent with persistent HP/,
  'positive HP must not project as fainted',
);
assert.throws(
  () => projectMaplessPokemonToShowdown(member({ hp: 35, fainted: 'false' })),
  /faint state requires an exact boolean/,
  'persisted faint state must never be truthy-coerced',
);
assert.throws(
  () => projectMaplessPokemonToShowdown(member({ hp: 35.5, fainted: false })),
  /Battle projection HP requires a non-negative integer/,
  'starting HP must be exact before faint consistency is evaluated',
);

console.log('reconstruction showdown starting faint exactness smoke: ok');
