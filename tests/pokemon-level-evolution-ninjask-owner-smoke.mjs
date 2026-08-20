import assert from "node:assert/strict";
import { resolvePokemonLevelEvolution } from "../runtime/pokemon-level-evolution-runtime.js";

const stats = (hp, attack, defense, specialAttack, specialDefense, speed) => ({
  HP: hp,
  ATTACK: attack,
  DEFENSE: defense,
  SPECIAL_ATTACK: specialAttack,
  SPECIAL_DEFENSE: specialDefense,
  SPEED: speed,
});

const speciesMasters = {
  NINCADA: {
    id: "NINCADA",
    form: 0,
    base_stats: stats(31, 45, 90, 30, 30, 40),
    evolutions: [
      ["NINJASK", "Ninjask", 20, false],
      ["SHEDINJA", "Shedinja", 20, false],
    ],
    level_moves: [[1, "SCRATCH"]],
  },
  NINJASK: {
    id: "NINJASK",
    form: 0,
    base_stats: stats(61, 90, 45, 50, 50, 160),
    evolutions: [],
    level_moves: [],
  },
};

const moveMasters = {
  SCRATCH: { id: "SCRATCH", total_pp: 35 },
};

function runtime(level) {
  return {
    species: "NINCADA",
    form: 0,
    level,
    exp: level ** 3,
    hp: 19,
    max_hp: 31,
    stats: stats(31, 45, 90, 30, 30, 40),
    iv: { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 },
    iv_maxed: { HP: false, ATTACK: false, DEFENSE: false, SPECIAL_ATTACK: false, SPECIAL_DEFENSE: false, SPEED: false },
    ev: { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 },
    moves: [{ id: "SCRATCH", pp: 11, ppup: 0 }],
    personal_id: 0x12345678,
    gender: 0,
    nature_id: null,
    nature_for_stats_id: null,
    ability: "COMPOUNDEYES",
    ability_id: "COMPOUNDEYES",
    held_item: "SILKSCARF",
    item: "SILKSCARF",
    status: "POISON",
    status_count: 2,
    steps_to_hatch: 0,
  };
}

const evolved = resolvePokemonLevelEvolution(runtime(20), {
  species_masters: speciesMasters,
  move_masters: moveMasters,
});
assert.equal(evolved.evolved, true);
assert.equal(evolved.evolution.method, "Ninjask");
assert.equal(evolved.evolution.to, "NINJASK");
assert.equal(evolved.pokemon.species, "NINJASK");
assert.deepEqual(evolved.unsupportedMethods, ["Shedinja"]);
assert.equal(evolved.pokemon.personal_id, 0x12345678);
assert.equal(evolved.pokemon.held_item, "SILKSCARF");
assert.equal(evolved.pokemon.status, "POISON");
assert.equal(evolved.pokemon.status_count, 2);
assert.equal(evolved.pokemon.moves[0].id, "SCRATCH");
assert.equal(evolved.pokemon.moves[0].pp, 11);
assert.notEqual(evolved.pokemon.hp, evolved.pokemon.max_hp);

const tooLow = resolvePokemonLevelEvolution(runtime(19), {
  species_masters: speciesMasters,
  move_masters: moveMasters,
});
assert.equal(tooLow.evolved, false);
assert.equal(tooLow.levelEvolutionCandidate, null);
assert.deepEqual(tooLow.unsupportedMethods, ["Shedinja"]);

console.log("canonical Ninjask level evolution owner: PASS");
