import assert from "node:assert/strict";
import { resolvePokemonLevelEvolution } from "../runtime/pokemon-level-evolution-runtime.js";

const stats = (hp, attack, defense, specialAttack, specialDefense, speed) => ({
  HP: hp, ATTACK: attack, DEFENSE: defense,
  SPECIAL_ATTACK: specialAttack, SPECIAL_DEFENSE: specialDefense, SPEED: speed,
});

const speciesMasters = {
  BASE: {
    id: "BASE", form: 0,
    base_stats: stats(40, 40, 40, 40, 40, 40),
    evolutions: [["EVOLVED", "Level", 12, false]],
    level_moves: [[1, "TACKLE"]],
  },
  EVOLVED: {
    id: "EVOLVED", form: 0,
    base_stats: stats(80, 70, 70, 70, 70, 70),
    evolutions: [["BASE", "Level", 12, true]],
    level_moves: [[0, "EVOMOVE"], [12, "LEVELMOVE"]],
  },
};

const moveMasters = {
  TACKLE: { id: "TACKLE", total_pp: 35 },
  EVOMOVE: { id: "EVOMOVE", total_pp: 10 },
  LEVELMOVE: { id: "LEVELMOVE", total_pp: 15 },
};

const runtime = {
  species: "BASE", form: 0, level: 12, exp: 1728,
  hp: 0, max_hp: 40,
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

const result = resolvePokemonLevelEvolution(runtime, {
  species_masters: speciesMasters,
  move_masters: moveMasters,
});

assert.equal(result.evolved, true);
assert.equal(result.pokemon.species, "EVOLVED");
assert.ok(result.pokemon.max_hp > runtime.max_hp, "fixture must exercise a positive max-HP delta");
const canonicalHp = Math.max(runtime.hp + (result.pokemon.max_hp - runtime.max_hp), 1);
assert.equal(
  result.pokemon.hp,
  canonicalHp,
  "Essentials calc_stats revives HP 0 only when max HP rises, using exactly the positive max-HP delta with a minimum of 1",
);
assert.deepEqual(result.pokemon.moves.map((move) => move.id), ["TACKLE", "EVOMOVE", "LEVELMOVE"]);
assert.equal(result.pokemon.moves[0].pp, 7, "existing PP must survive evolution move learning");
assert.equal(result.pokemon.personal_id, 424242);
assert.equal(result.pokemon.ability, "KEEPABILITY");
assert.equal(result.pokemon.held_item, "KEEPITEM");
assert.equal(result.pokemon.status, "POISON");
assert.equal(result.pokemon.status_count, 2);

console.log("generic Level evolution canonical fainted HP recalculation: PASS");
