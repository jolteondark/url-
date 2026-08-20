import assert from "node:assert/strict";
import { resolvePokemonLevelEvolution } from "../runtime/pokemon-level-evolution-runtime.js";

const stats = (hp, attack, defense, specialAttack, specialDefense, speed) => ({
  HP: hp, ATTACK: attack, DEFENSE: defense,
  SPECIAL_ATTACK: specialAttack, SPECIAL_DEFENSE: specialDefense, SPEED: speed,
});

const sharedStats = stats(40, 40, 40, 40, 40, 40);
const speciesMasters = {
  BASE: {
    id: "BASE", form: 0,
    base_stats: sharedStats,
    evolutions: [
      ["MALE_EVOLVED", "LevelMale", 20, false],
      ["FEMALE_EVOLVED", "LevelFemale", 20, false],
      ["ITEM_EVOLVED", "Item", "MOONSTONE", false],
    ],
    level_moves: [[1, "TACKLE"]],
  },
  MALE_EVOLVED: {
    id: "MALE_EVOLVED", form: 0,
    base_stats: sharedStats,
    evolutions: [
      ["BASE", "LevelMale", 20, true],
      ["NEXT", "LevelFemale", 30, false],
      ["ITEM_NEXT", "Item", "SUNSTONE", false],
    ],
    level_moves: [],
  },
  FEMALE_EVOLVED: {
    id: "FEMALE_EVOLVED", form: 0,
    base_stats: sharedStats,
    evolutions: [
      ["BASE", "LevelFemale", 20, true],
      ["NEXT", "LevelMale", 30, false],
      ["ITEM_NEXT", "Item", "SUNSTONE", false],
    ],
    level_moves: [],
  },
};

const moveMasters = {
  TACKLE: { id: "TACKLE", total_pp: 35 },
};

function runtime(gender) {
  return {
    species: "BASE", form: 0, level: 20, exp: 8000,
    hp: 23, max_hp: 40,
    stats: { ATTACK: 40, DEFENSE: 40, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 40, SPEED: 40 },
    iv: { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 },
    iv_maxed: { HP: false, ATTACK: false, DEFENSE: false, SPECIAL_ATTACK: false, SPECIAL_DEFENSE: false, SPEED: false },
    ev: { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 },
    moves: [{ id: "TACKLE", pp: 7, ppup: 0 }],
    personal_id: 424242,
    gender,
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
}

const male = resolvePokemonLevelEvolution(runtime(0), {
  species_masters: speciesMasters,
  move_masters: moveMasters,
});
assert.equal(male.evolved, true);
assert.equal(male.evolution.method, "LevelMale");
assert.equal(male.pokemon.species, "MALE_EVOLVED");
assert.deepEqual(male.unsupportedMethods, ["Item"]);
assert.equal(male.pokemon.personal_id, 424242);
assert.equal(male.pokemon.ability, "KEEPABILITY");
assert.equal(male.pokemon.held_item, "KEEPITEM");
assert.equal(male.pokemon.status, "POISON");
assert.equal(male.pokemon.status_count, 2);
assert.equal(male.pokemon.moves[0].pp, 7);

const female = resolvePokemonLevelEvolution(runtime(1), {
  species_masters: speciesMasters,
  move_masters: moveMasters,
});
assert.equal(female.evolved, true);
assert.equal(female.evolution.method, "LevelFemale");
assert.equal(female.pokemon.species, "FEMALE_EVOLVED");
assert.deepEqual(female.unsupportedMethods, ["Item"]);
assert.equal(female.pokemon.personal_id, 424242);
assert.equal(female.pokemon.held_item, "KEEPITEM");
assert.equal(female.pokemon.moves[0].pp, 7);

const genderless = resolvePokemonLevelEvolution(runtime(2), {
  species_masters: speciesMasters,
  move_masters: moveMasters,
});
assert.equal(genderless.evolved, false);
assert.equal(genderless.levelEvolutionCandidate, null);
assert.deepEqual(genderless.unsupportedMethods, ["Item"]);
assert.equal(genderless.pokemon.species, "BASE");
assert.equal(genderless.pokemon.personal_id, 424242);
assert.equal(genderless.pokemon.held_item, "KEEPITEM");
assert.equal(genderless.pokemon.moves[0].pp, 7);

console.log("generic LevelMale/LevelFemale evolution owner: PASS");
