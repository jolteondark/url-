import assert from 'node:assert/strict';
import { projectMaplessPokemonToShowdown } from '../src-next/core/battle/showdown-roundtrip.js';

const persistent = {
  id: 'hero-rotom', species: 'Rotom-Wash', name: 'Washer', level: 37, ability: 'Levitate', hp: 61, maxhp: 83,
  status: 'par', heldItem: 'Leftovers', fainted: false,
  moves: [{ id: 'hydropump', pp: 3, maxpp: 8 }, { id: 'voltswitch', pp: 11, maxpp: 20 }],
};
const projected = projectMaplessPokemonToShowdown(persistent);
assert.equal(projected.maplessId, persistent.id);
assert.equal(projected.species, persistent.species);
assert.equal(projected.level, persistent.level);
assert.equal(projected.ability, persistent.ability);
assert.equal(projected.hp, persistent.hp);
assert.equal(projected.maxhp, persistent.maxhp);
assert.equal(projected.status, persistent.status);
assert.equal(projected.heldItem, persistent.heldItem);
assert.equal(projected.fainted, false);
assert.deepEqual(projected.moves, persistent.moves, 'move identity, slot order, current PP, and max PP must reach Showdown preflight unchanged');

const form = projectMaplessPokemonToShowdown({ ...persistent, id: 'form-check', species: 'Rotom-Heat' });
assert.equal(form.species, 'Rotom-Heat');

for (const level of [0, 101, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
  assert.throws(() => projectMaplessPokemonToShowdown({ ...persistent, id: `bad-level-${String(level)}`, level }), /level requires an integer from 1 through 100/);
}
for (const maxhp of [0, -1, 83.5, Number.NaN, Number.POSITIVE_INFINITY]) {
  assert.throws(() => projectMaplessPokemonToShowdown({ ...persistent, id: `bad-maxhp-${String(maxhp)}`, maxhp }), /max HP requires a positive integer/);
}
assert.throws(() => projectMaplessPokemonToShowdown({ ...persistent, id: 'hp-over-max', hp: 84, maxhp: 83 }), /HP is outside persistent max HP bounds: 84\/83/);
assert.throws(() => projectMaplessPokemonToShowdown({ ...persistent, id: 'missing-maxhp', maxhp: undefined }), /max HP requires a positive integer/);

const withMove = (move) => ({ ...persistent, id: `move-${String(move.id ?? 'missing')}`, moves: [move] });
for (const pp of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
  assert.throws(() => projectMaplessPokemonToShowdown(withMove({ id: 'hydropump', pp, maxpp: 8 })), /Battle projection PP for hydropump requires a non-negative integer/);
}
for (const maxpp of [0, -1, 8.5, Number.NaN, Number.POSITIVE_INFINITY]) {
  assert.throws(() => projectMaplessPokemonToShowdown(withMove({ id: 'hydropump', pp: 3, maxpp })), /Battle projection max PP/);
}
assert.throws(() => projectMaplessPokemonToShowdown(withMove({ id: 'hydropump', pp: 9, maxpp: 8 })), /PP is outside persistent bounds for hydropump: 9\/8/);
assert.throws(() => projectMaplessPokemonToShowdown(withMove({ id: '', pp: 3, maxpp: 8 })), /stable move id/);
assert.throws(
  () => projectMaplessPokemonToShowdown({ ...persistent, id: 'duplicate-moves', moves: [{ id: 'Hydro Pump', pp: 3, maxpp: 8 }, { id: 'hydropump', pp: 2, maxpp: 8 }] }),
  /requires unique move ids: hydropump/,
  'canonical-equivalent duplicate move ids must fail before Showdown session construction',
);
assert.throws(() => projectMaplessPokemonToShowdown(withMove({ id: 'hydropump', pp: 3 })), /Battle projection max PP/);

console.log('reconstruction Showdown round-trip mechanics input continuity smoke: ok');
