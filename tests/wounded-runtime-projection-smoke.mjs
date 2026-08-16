import assert from 'node:assert/strict';
import { prepareWoundedPokemonSnapshot, materializeWoundedPokemonFromSnapshot, scaledWoundedNormalLevel } from '../runtime/wounded-pokemon-preparation-runtime.js';
import { resolveWoundedTreatmentRuntime } from '../runtime/wounded-treatment-runtime-integration.js';

assert.equal(scaledWoundedNormalLevel(1), 3);
assert.equal(scaledWoundedNormalLevel(6), 5);

const base = {
  species: 'RATTATA', level: 5, personal_id: 1234567, ability_index: 0, gender: 0,
  nature_id: 'HARDY', iv: { HP: 10, ATTACK: 10, DEFENSE: 10, SPECIAL_ATTACK: 10, SPECIAL_DEFENSE: 10, SPEED: 10 },
  moves: ['TACKLE'], hp: 1, max_hp: 30, status: 'NONE', happiness: 70,
};
const prepared = prepareWoundedPokemonSnapshot({
  day: 6,
  event: { kind: 'normal_event', normal_event_id: 'wounded_pokemon', normal_data: { normal_seed: 55 } },
  validGeneralSpeciesPool: ['RATTATA'],
  resolvedPokemon: base,
});
const wounded = materializeWoundedPokemonFromSnapshot(prepared.event, (input) => ({ ...base, ...input, max_hp: 30 }));
assert.equal(wounded.hp, 1);

const joined = resolveWoundedTreatmentRuntime({
  event: prepared.event,
  pokemon: wounded,
  party: [{ species: 'EEVEE' }],
  slots: [['POTION', 2]],
  itemId: 'POTION',
  choice: 'treat',
});
assert.equal(joined.outcome, 'joined');
assert.equal(joined.joinedPokemon.hp, 21);
assert.deepEqual(joined.slots, [['POTION', 1]]);

console.log('wounded runtime projection smoke: PASS');
