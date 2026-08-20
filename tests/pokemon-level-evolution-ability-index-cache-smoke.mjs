import assert from "node:assert/strict";
import { resolvePokemonLevelEvolution } from "../runtime/pokemon-level-evolution-runtime.js";

const zeroStats = { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 };
const zeroMaxed = { HP: false, ATTACK: false, DEFENSE: false, SPECIAL_ATTACK: false, SPECIAL_DEFENSE: false, SPEED: false };
const baseStats = { HP: 50, ATTACK: 50, DEFENSE: 50, SPECIAL_ATTACK: 50, SPECIAL_DEFENSE: 50, SPEED: 50 };
const moveMasters = { TACKLE: { id: "TACKLE", total_pp: 35 } };

function runtime(abilityIndex) {
  return {
    species: "SOURCE",
    form: 0,
    level: 20,
    exp: 8000,
    hp: 25,
    max_hp: 40,
    stats: { ATTACK: 20, DEFENSE: 20, SPECIAL_ATTACK: 20, SPECIAL_DEFENSE: 20, SPEED: 20 },
    iv: zeroStats,
    iv_maxed: zeroMaxed,
    ev: zeroStats,
    moves: [{ id: "TACKLE", pp: 12, ppup: 0 }],
    personal_id: 5,
    gender: 0,
    nature_id: null,
    nature_for_stats_id: null,
    ability_index: abilityIndex,
    ability_id: "SOURCE0",
    ability: "SOURCE0",
    item: "KEPTITEM",
    held_item: "KEPTITEM",
    status: "POISON",
    status_count: 2,
  };
}

const speciesMasters = {
  SOURCE: {
    id: "SOURCE",
    form: 0,
    growth_rate: "Medium",
    base_stats: baseStats,
    abilities: ["SOURCE0", "SOURCE1"],
    evolutions: [["TARGET", "Level", 20]],
    level_moves: [[1, "TACKLE"]],
  },
  TARGET: {
    id: "TARGET",
    form: 0,
    growth_rate: "Medium",
    base_stats: baseStats,
    abilities: ["TARGET0", "TARGET1"],
    hidden_abilities: [],
    evolutions: [],
    level_moves: [],
  },
};

const natural = resolvePokemonLevelEvolution(runtime(null), {
  species_masters: speciesMasters,
  move_masters: moveMasters,
}).pokemon;
assert.equal(natural.ability_index, 1, "canonical ability_index getter must cache personal-ID parity when the index is unset");
assert.equal(natural.ability, "TARGET1");
assert.equal(natural.ability_id, "TARGET1");
assert.equal(natural.personal_id, 5);
assert.equal(natural.held_item, "KEPTITEM");
assert.equal(natural.status, "POISON");
assert.equal(natural.moves[0].pp, 12, "evolution ability resolution must not restore move PP");

const missingHidden = resolvePokemonLevelEvolution(runtime(2), {
  species_masters: speciesMasters,
  move_masters: moveMasters,
}).pokemon;
assert.equal(missingHidden.ability_index, 2, "canonical hidden-ability fallback must preserve the stored ability index");
assert.equal(missingHidden.ability, "TARGET1", "missing hidden ability must fall back to personal-ID natural slot");
assert.equal(missingHidden.ability_id, "TARGET1");

console.log("pokemon-level-evolution ability-index cache smoke: PASS");
