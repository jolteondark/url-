import assert from "node:assert/strict";
import { resolvePokemonLevelEvolution } from "../runtime/pokemon-level-evolution-runtime.js";

const zeroStats = { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 };
const zeroMaxed = { HP: false, ATTACK: false, DEFENSE: false, SPECIAL_ATTACK: false, SPECIAL_DEFENSE: false, SPEED: false };
const moveMasters = { TACKLE: { id: "TACKLE", total_pp: 35 } };

function speciesPair(source, target, targetGenderFields = {}) {
  return {
    [source]: {
      id: source,
      form: 0,
      base_stats: { HP: 40, ATTACK: 40, DEFENSE: 40, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 40, SPEED: 40 },
      abilities: ["OLDA"],
      evolutions: [[target, "Level", 20]],
      level_moves: [[1, "TACKLE"]],
    },
    [target]: {
      id: target,
      form: 0,
      base_stats: { HP: 70, ATTACK: 70, DEFENSE: 70, SPECIAL_ATTACK: 70, SPECIAL_DEFENSE: 70, SPEED: 70 },
      abilities: ["NEWA"],
      evolutions: [[source, "Level", 20, true]],
      level_moves: [[1, "TACKLE"]],
      ...targetGenderFields,
    },
  };
}

function makePokemon(species, gender) {
  return {
    species,
    form: 0,
    forced_form: null,
    level: 20,
    exp: 8000,
    hp: 18,
    max_hp: 30,
    stats: { ATTACK: 20, DEFENSE: 20, SPECIAL_ATTACK: 20, SPECIAL_DEFENSE: 20, SPEED: 20 },
    iv: zeroStats,
    iv_maxed: zeroMaxed,
    ev: zeroStats,
    moves: [{ id: "TACKLE", pp: 4, ppup: 0 }],
    personal_id: 987654321,
    gender,
    nature_id: null,
    nature_for_stats_id: null,
    ability_id: "OLDA",
    ability_index: 0,
    ability: "OLDA",
    item: "KEPTITEM",
    held_item: "KEPTITEM",
    status: "POISON",
    status_count: 2,
  };
}

function evolve(source, target, targetGenderFields, startingGender) {
  return resolvePokemonLevelEvolution(makePokemon(source, startingGender), {
    species_masters: speciesPair(source, target, targetGenderFields),
    move_masters: moveMasters,
  });
}

const male = evolve("SOURCE_MALE", "TARGET_MALE", { gender_ratio: "AlwaysMale" }, 1);
assert.equal(male.evolved, true);
assert.equal(male.pokemon.gender, 0, "evolution into an AlwaysMale species must invalidate the old gender cache");
assert.equal(male.pokemon.personal_id, 987654321);
assert.equal(male.pokemon.held_item, "KEPTITEM");
assert.equal(male.pokemon.status, "POISON");
assert.equal(male.pokemon.moves[0].pp, 4);

const female = evolve("SOURCE_FEMALE", "TARGET_FEMALE", { gender_ratio: ":AlwaysFemale" }, 0);
assert.equal(female.pokemon.gender, 1, "evolution into an AlwaysFemale species must recompute gender");

const genderless = evolve("SOURCE_NONE", "TARGET_NONE", { gender_ratio_id: "Genderless" }, 0);
assert.equal(genderless.pokemon.gender, 2, "evolution into a genderless species must recompute gender");

const mixed = evolve("SOURCE_MIXED", "TARGET_MIXED", { gender_ratio: "Female50Percent" }, 1);
assert.equal(mixed.pokemon.gender, 1, "mixed-gender evolution targets must preserve the cached individual gender");

console.log("pokemon-level-evolution gender recompute smoke: PASS");
