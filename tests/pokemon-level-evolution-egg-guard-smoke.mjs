import assert from "node:assert/strict";
import { resolvePokemonLevelEvolution } from "../runtime/pokemon-level-evolution-runtime.js";

const baseStats = { HP: 45, ATTACK: 49, DEFENSE: 49, SPECIAL_ATTACK: 65, SPECIAL_DEFENSE: 65, SPEED: 45 };
const evolvedStats = { HP: 60, ATTACK: 62, DEFENSE: 63, SPECIAL_ATTACK: 80, SPECIAL_DEFENSE: 80, SPEED: 60 };
const moveMasters = { TACKLE: { id: "TACKLE", total_pp: 35 } };
const speciesMasters = {
  SEED: {
    id: "SEED", form: 0, base_stats: baseStats,
    evolutions: [["BLOOM", "Level", 16], ["STONEBLOOM", "Item", "LEAFSTONE"]],
    level_moves: [[1, "TACKLE"]],
  },
  BLOOM: {
    id: "BLOOM", form: 0, base_stats: evolvedStats,
    evolutions: [], level_moves: [[1, "TACKLE"]],
  },
};

const egg = {
  species: "SEED", form: 0, level: 16, exp: 4096,
  hp: 20, max_hp: 20,
  stats: { ATTACK: 10, DEFENSE: 10, SPECIAL_ATTACK: 10, SPECIAL_DEFENSE: 10, SPEED: 10 },
  iv: { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 },
  iv_maxed: { HP: false, ATTACK: false, DEFENSE: false, SPECIAL_ATTACK: false, SPECIAL_DEFENSE: false, SPEED: false },
  ev: { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 },
  moves: [{ id: "TACKLE", pp: 7, ppup: 0 }],
  personal_id: 123456, gender: 0,
  nature_id: null, nature_for_stats_id: null,
  ability_id: null, item: null, status: null, status_count: 0,
  steps_to_hatch: 42,
};

const blocked = resolvePokemonLevelEvolution(egg, {
  species_masters: speciesMasters,
  move_masters: moveMasters,
});
assert.equal(blocked.evolved, false);
assert.deepEqual(blocked.levelEvolutionCandidate, { to: "BLOOM", method: "Level", parameter: 16 });
assert.equal(blocked.evolutionBlockedBy, "EGG");
assert.deepEqual(blocked.unsupportedMethods, ["Item"]);
assert.equal(blocked.pokemon.species, "SEED");
assert.equal(blocked.pokemon.personal_id, 123456);
assert.equal(blocked.pokemon.moves[0].pp, 7);
assert.equal(blocked.pokemon.steps_to_hatch, 42);
assert.deepEqual(blocked.operations, [{ op: "level_evolution_blocked", blocker: "EGG" }]);

const hatched = resolvePokemonLevelEvolution({ ...egg, steps_to_hatch: 0 }, {
  species_masters: speciesMasters,
  move_masters: moveMasters,
});
assert.equal(hatched.evolved, true);
assert.equal(hatched.pokemon.species, "BLOOM");
assert.equal(hatched.pokemon.personal_id, 123456);
assert.equal(hatched.pokemon.moves[0].pp, 7);
assert.equal(hatched.pokemon.steps_to_hatch, 0);
assert.ok(hatched.unsupportedMethods.includes("Item"));

console.log("pokemon-level-evolution egg guard smoke: PASS");
