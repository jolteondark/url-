import assert from "node:assert/strict";
import { resolvePokemonLevelEvolution } from "../runtime/pokemon-level-evolution-runtime.js";

const stats = (hp, attack, defense, specialAttack, specialDefense, speed) => ({
  HP: hp, ATTACK: attack, DEFENSE: defense,
  SPECIAL_ATTACK: specialAttack, SPECIAL_DEFENSE: specialDefense, SPEED: speed,
});
const moveMasters = { TACKLE: { id: "TACKLE", total_pp: 35 } };
const speciesMasters = {
  SEED: {
    id: "SEED", form: 0, base_stats: stats(45, 49, 49, 65, 65, 45),
    evolutions: [["BLOOM", "Level", 16, false]], level_moves: [[1, "TACKLE"]],
  },
  BLOOM: {
    id: "BLOOM", form: 0, base_stats: stats(60, 62, 63, 80, 80, 60),
    evolutions: [
      ["SEED", "Level", 16, true],
      ["TREE", "Level", 32, false],
      ["STONEBLOOM", "Item", "LEAFSTONE", false],
    ],
    level_moves: [[1, "TACKLE"]],
  },
  TREE: {
    id: "TREE", form: 0, base_stats: stats(80, 82, 83, 100, 100, 80),
    evolutions: [["BLOOM", "Level", 32, true]], level_moves: [[1, "TACKLE"]],
  },
};

const runtime = {
  species: "BLOOM", form: 0, level: 32, exp: 32768,
  hp: 41, max_hp: 60,
  stats: { ATTACK: 62, DEFENSE: 63, SPECIAL_ATTACK: 80, SPECIAL_DEFENSE: 80, SPEED: 60 },
  iv: { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 },
  iv_maxed: { HP: false, ATTACK: false, DEFENSE: false, SPECIAL_ATTACK: false, SPECIAL_DEFENSE: false, SPEED: false },
  ev: { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 },
  moves: [{ id: "TACKLE", pp: 7, ppup: 0 }],
  personal_id: 8675309, gender: 0,
  nature_id: null, nature_for_stats_id: null,
  ability: "OVERGROW", ability_id: "STALE_ALIAS",
  held_item: "MIRACLESEED", item: "STALE_ITEM_ALIAS",
  status: "POISON", status_count: 2,
  steps_to_hatch: 0,
};

const result = resolvePokemonLevelEvolution(runtime, {
  species_masters: speciesMasters,
  move_masters: moveMasters,
});
assert.equal(result.evolved, true);
assert.deepEqual(result.levelEvolutionCandidate, { to: "TREE", method: "Level", parameter: 32 });
assert.deepEqual(result.evolution, { from: "BLOOM", to: "TREE", method: "Level", parameter: 32 });
assert.ok(result.unsupportedMethods.includes("Item"));
assert.equal(result.pokemon.species, "TREE");
assert.notEqual(result.pokemon.species, "SEED");
assert.equal(result.pokemon.personal_id, 8675309);
assert.equal(result.pokemon.ability, "OVERGROW");
assert.equal(result.pokemon.held_item, "MIRACLESEED");
assert.equal(result.pokemon.status, "POISON");
assert.equal(result.pokemon.status_count, 2);
assert.equal(result.pokemon.moves[0].id, "TACKLE");
assert.equal(result.pokemon.moves[0].pp, 7);
assert.ok(result.pokemon.hp > 0 && result.pokemon.hp < result.pokemon.max_hp);

const terminal = resolvePokemonLevelEvolution({ ...result.pokemon, level: 100 }, {
  species_masters: speciesMasters,
  move_masters: moveMasters,
});
assert.equal(terminal.evolved, false);
assert.equal(terminal.levelEvolutionCandidate, null);
assert.equal(terminal.pokemon.species, "TREE");

console.log("pokemon-level-evolution prevolution guard smoke: PASS");
