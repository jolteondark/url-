import assert from 'node:assert/strict';
import { projectMaplessPokemonToShowdown } from '../src-next/core/battle/showdown-roundtrip.js';

const persistent = {
  id: 'hero-rotom',
  species: 'Rotom-Wash',
  name: 'Washer',
  level: 37,
  ability: 'Levitate',
  hp: 61,
  maxhp: 83,
  status: 'par',
  heldItem: 'Leftovers',
  fainted: false,
  moves: [
    { id: 'hydropump', pp: 3, maxpp: 8 },
    { id: 'voltswitch', pp: 11, maxpp: 20 },
  ],
};

const projected = projectMaplessPokemonToShowdown(persistent);

assert.equal(projected.maplessId, persistent.id, 'stable persistent identity must survive the round-trip entrance');
assert.equal(projected.species, persistent.species, 'species/form identity must survive the round-trip entrance exactly');
assert.equal(projected.level, persistent.level, 'level must survive the round-trip entrance exactly');
assert.equal(projected.ability, persistent.ability, 'explicit ability must survive the round-trip entrance exactly');
assert.equal(projected.hp, persistent.hp, 'current HP must survive the round-trip entrance exactly');
assert.equal(projected.maxhp, persistent.maxhp, 'persistent max-HP metadata must reach Showdown preflight');
assert.equal(projected.status, persistent.status, 'major status must survive the round-trip entrance exactly');
assert.equal(projected.heldItem, persistent.heldItem, 'held item must survive the round-trip entrance exactly');
assert.equal(projected.fainted, false, 'faint state must remain consistent with persistent HP');
assert.deepEqual(
  projected.moves,
  persistent.moves,
  'move identity, slot order, current PP, and max PP must reach Showdown preflight unchanged',
);

const form = projectMaplessPokemonToShowdown({ ...persistent, id: 'form-check', species: 'Rotom-Heat' });
assert.equal(form.species, 'Rotom-Heat', 'form identity must not collapse to a base species before Showdown instantiation');

for (const level of [0, 101, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
  assert.throws(
    () => projectMaplessPokemonToShowdown({ ...persistent, id: `bad-level-${String(level)}`, level }),
    /level requires an integer from 1 through 100/,
    `invalid persistent level ${String(level)} must fail before Showdown session construction`,
  );
}
for (const maxhp of [0, -1, 83.5, Number.NaN, Number.POSITIVE_INFINITY]) {
  assert.throws(
    () => projectMaplessPokemonToShowdown({ ...persistent, id: `bad-maxhp-${String(maxhp)}`, maxhp }),
    /max HP requires a positive integer/,
    `invalid persistent max HP ${String(maxhp)} must fail before Showdown session construction`,
  );
}
assert.throws(
  () => projectMaplessPokemonToShowdown({ ...persistent, id: 'hp-over-max', hp: 84, maxhp: 83 }),
  /HP is outside persistent max HP bounds: 84\/83/,
  'current HP above persistent max HP must fail before Showdown session construction',
);
assert.throws(
  () => projectMaplessPokemonToShowdown({ ...persistent, id: 'missing-maxhp', maxhp: undefined }),
  /max HP requires a positive integer/,
  'missing persistent max HP must not silently reach Showdown as NaN',
);

console.log('reconstruction Showdown round-trip mechanics input continuity smoke: ok');
