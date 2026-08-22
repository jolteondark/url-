import assert from "node:assert/strict";
import { resolvePokemonItemEvolution } from "../runtime/pokemon-item-evolution-runtime.js";

const baseStats = { HP: 40, ATTACK: 40, DEFENSE: 40, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 40, SPEED: 40 };
const targetStats = { HP: 60, ATTACK: 60, DEFENSE: 55, SPECIAL_ATTACK: 60, SPECIAL_DEFENSE: 55, SPEED: 50 };
const speciesMasters = {
  BASE: {
    id: "BASE", form: 0, base_stats: baseStats,
    evolutions: [["EVOLVED", "Item", "MOONSTONE", false]],
    level_moves: [[1, "TACKLE"]],
  },
  EVOLVED: {
    id: "EVOLVED", form: 0, base_stats: targetStats,
    evolutions: [["BASE", "Item", "MOONSTONE", true]],
    level_moves: [],
  },
};
const moveMasters = { TACKLE: { id: "TACKLE", total_pp: 35 } };
const pokemon = {
  species: "BASE", form: 0, level: 20, exp: 8000,
  hp: 23, max_hp: 40,
  stats: { ATTACK: 40, DEFENSE: 40, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 40, SPEED: 40 },
  iv: { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 },
  iv_maxed: { HP: false, ATTACK: false, DEFENSE: false, SPECIAL_ATTACK: false, SPECIAL_DEFENSE: false, SPEED: false },
  ev: { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 },
  moves: [{ id: "TACKLE", pp: 7, ppup: 0 }],
  personal_id: 424242,
  gender: 0,
  nature_id: null,
  nature_for_stats_id: null,
  ability: "KEEPABILITY",
  ability_id: "STALEABILITY",
  held_item: "KEEPITEM",
  item: "STALEITEM",
  status: "POISON",
  status_count: 2,
  steps_to_hatch: 0,
};

const wrong = resolvePokemonItemEvolution(pokemon, "SUNSTONE", {
  species_masters: speciesMasters,
  move_masters: moveMasters,
});
assert.equal(wrong.evolved, false);
assert.equal(wrong.consumeRequested, false);
assert.equal(wrong.pokemon, pokemon);

const evolved = resolvePokemonItemEvolution(pokemon, ":MOONSTONE", {
  species_masters: speciesMasters,
  move_masters: moveMasters,
});
assert.equal(evolved.evolved, true);
assert.deepEqual(evolved.evolution, { from: "BASE", to: "EVOLVED", method: "Item", parameter: "MOONSTONE" });
assert.equal(evolved.consumeRequested, true);
assert.equal(evolved.consumedItem, "MOONSTONE");
assert.equal(evolved.pokemon.species, "EVOLVED");
assert.equal(evolved.pokemon.personal_id, 424242);
assert.equal(evolved.pokemon.held_item, "KEEPITEM");
assert.equal(evolved.pokemon.status, "POISON");
assert.equal(evolved.pokemon.status_count, 2);
assert.equal(evolved.pokemon.moves[0].pp, 7);
assert.ok(evolved.pokemon.max_hp > pokemon.max_hp);
assert.equal(evolved.pokemon.hp, pokemon.hp + (evolved.pokemon.max_hp - pokemon.max_hp));
assert.equal(evolved.operations.filter((op) => op.op === "item_evolution").length, 1);

const blockedPokemon = { ...pokemon, held_item: "EVERSTONE" };
const blocked = resolvePokemonItemEvolution(blockedPokemon, "MOONSTONE", {
  species_masters: speciesMasters,
  move_masters: moveMasters,
});
assert.equal(blocked.evolved, false);
assert.equal(blocked.evolutionBlockedBy, "EVERSTONE");
assert.equal(blocked.consumeRequested, false);
assert.equal(blocked.pokemon, blockedPokemon);

console.log("generic Item/Stone evolution owner: PASS");
