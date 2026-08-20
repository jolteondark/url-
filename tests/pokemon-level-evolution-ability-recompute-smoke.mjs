import assert from "node:assert/strict";
import { resolvePokemonLevelEvolution } from "../runtime/pokemon-level-evolution-runtime.js";

const zeroStats = { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 };
const moveMasters = { TACKLE: { id: "TACKLE", total_pp: 35 } };
const speciesMasters = {
  SOURCE: {
    id: "SOURCE", form: 0,
    base_stats: { HP: 40, ATTACK: 40, DEFENSE: 40, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 40, SPEED: 40 },
    abilities: ["OLDA", "OLDB"], hidden_abilities: ["OLDHIDDEN"],
    evolutions: [["TARGET", "Level", 20]], level_moves: [[1, "TACKLE"]],
  },
  TARGET: {
    id: "TARGET", form: 0,
    base_stats: { HP: 70, ATTACK: 70, DEFENSE: 70, SPECIAL_ATTACK: 70, SPECIAL_DEFENSE: 70, SPEED: 70 },
    abilities: ["NEWA", "NEWB"], hidden_abilities: ["NEWHIDDEN"],
    evolutions: [["SOURCE", "Level", 20, true]], level_moves: [[1, "TACKLE"]],
  },
};

function makePokemon(overrides = {}) {
  return {
    species: "SOURCE", form: 0, forced_form: null, level: 20, exp: 8000,
    hp: 18, max_hp: 30,
    stats: { ATTACK: 20, DEFENSE: 20, SPECIAL_ATTACK: 20, SPECIAL_DEFENSE: 20, SPEED: 20 },
    iv: zeroStats,
    iv_maxed: { HP: false, ATTACK: false, DEFENSE: false, SPECIAL_ATTACK: false, SPECIAL_DEFENSE: false, SPEED: false },
    ev: zeroStats,
    moves: [{ id: "TACKLE", pp: 4, ppup: 0 }],
    personal_id: 987654321, gender: 0,
    nature_id: null, nature_for_stats_id: null,
    ability_id: "OLDB", ability_index: 1, ability: "OLDB",
    item: "KEPTITEM", held_item: "KEPTITEM",
    status: "POISON", status_count: 2,
    ...overrides,
  };
}

const natural = resolvePokemonLevelEvolution(makePokemon(), {
  species_masters: speciesMasters,
  move_masters: moveMasters,
});
assert.equal(natural.evolved, true);
assert.equal(natural.pokemon.species, "TARGET");
assert.equal(natural.pokemon.ability_index, 1, "individual ability slot must survive evolution");
assert.equal(natural.pokemon.ability, "NEWB", "species change must invalidate the old ability cache and resolve the target species ability");
assert.equal(natural.pokemon.ability_id, "NEWB", "legacy ability alias must not retain the pre-evolution ability");
assert.equal(natural.pokemon.held_item, "KEPTITEM");
assert.equal(natural.pokemon.personal_id, 987654321);
assert.equal(natural.pokemon.moves[0].pp, 4);
assert.equal(natural.pokemon.status, "POISON");

const hidden = resolvePokemonLevelEvolution(makePokemon({
  ability_id: "OLDHIDDEN", ability_index: 2, ability: "OLDHIDDEN",
}), {
  species_masters: speciesMasters,
  move_masters: moveMasters,
});
assert.equal(hidden.pokemon.ability_index, 2);
assert.equal(hidden.pokemon.ability, "NEWHIDDEN", "hidden ability slot must resolve against the evolved species");
assert.equal(hidden.pokemon.ability_id, "NEWHIDDEN");

console.log("pokemon-level-evolution ability recompute smoke: PASS");
