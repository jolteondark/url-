import assert from "node:assert/strict";
import { resolvePokemonLevelEvolution } from "../runtime/pokemon-level-evolution-runtime.js";

const zeroStats = { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 };
const zeroMaxed = { HP: false, ATTACK: false, DEFENSE: false, SPECIAL_ATTACK: false, SPECIAL_DEFENSE: false, SPEED: false };
const moveMasters = {
  TACKLE: { id: "TACKLE", total_pp: 35 },
  GROWL: { id: "GROWL", total_pp: 40 },
  EVOMOVE: { id: "EVOMOVE", total_pp: 10 },
  FAST21: { id: "FAST21", total_pp: 15 },
  WRONG20: { id: "WRONG20", total_pp: 5 },
};

const speciesMasters = {
  SOURCE: {
    id: "SOURCE",
    form: 0,
    growth_rate: "Medium",
    base_stats: { HP: 40, ATTACK: 40, DEFENSE: 40, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 40, SPEED: 40 },
    abilities: ["OLDA"],
    evolutions: [["TARGET", "Level", 20], ["ITEMTARGET", "Item", "STONE"]],
    level_moves: [[1, "TACKLE"]],
  },
  TARGET: {
    id: "TARGET",
    form: 0,
    growth_rate: "Fast",
    base_stats: { HP: 70, ATTACK: 70, DEFENSE: 70, SPECIAL_ATTACK: 70, SPECIAL_DEFENSE: 70, SPEED: 70 },
    abilities: ["NEWA"],
    evolutions: [["SOURCE", "Level", 20, true], ["TRADETARGET", "Trade", null]],
    level_moves: [[0, "EVOMOVE"], [20, "WRONG20"], [21, "FAST21"]],
  },
  ITEMTARGET: { id: "ITEMTARGET", form: 0, base_stats: { HP: 80, ATTACK: 80, DEFENSE: 80, SPECIAL_ATTACK: 80, SPECIAL_DEFENSE: 80, SPEED: 80 }, evolutions: [], level_moves: [] },
  TRADETARGET: { id: "TRADETARGET", form: 0, base_stats: { HP: 90, ATTACK: 90, DEFENSE: 90, SPECIAL_ATTACK: 90, SPECIAL_DEFENSE: 90, SPEED: 90 }, evolutions: [], level_moves: [] },
};

const before = {
  species: "SOURCE",
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
  moves: [
    { id: "TACKLE", pp: 4, ppup: 0 },
    { id: "GROWL", pp: 7, ppup: 0 },
  ],
  personal_id: 987654321,
  gender: 0,
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

const result = resolvePokemonLevelEvolution(before, {
  species_masters: speciesMasters,
  move_masters: moveMasters,
});

assert.equal(result.evolved, true);
assert.equal(result.pokemon.species, "TARGET");
assert.equal(result.pokemon.exp, 8000, "evolution must preserve accumulated EXP");
assert.equal(result.pokemon.level, 21, "species change must recompute level from the target Fast growth rate");
assert.equal(result.pokemon.personal_id, 987654321, "evolution must preserve individual identity");
assert.equal(result.pokemon.held_item, "KEPTITEM");
assert.equal(result.pokemon.status, "POISON");
assert.equal(result.pokemon.status_count, 2);
assert.equal(result.pokemon.moves.find((move) => move.id === "TACKLE")?.pp, 4, "existing PP must not be restored");
assert.equal(result.pokemon.moves.find((move) => move.id === "GROWL")?.pp, 7, "existing PP must remain exact");
assert.ok(result.pokemon.moves.some((move) => move.id === "EVOMOVE"), "target evolution move must be learned");
assert.ok(result.pokemon.moves.some((move) => move.id === "FAST21"), "target current-level move must use the recomputed level");
assert.ok(!result.pokemon.moves.some((move) => move.id === "WRONG20"), "target old source-level move must not be learned after growth-rate recompute");
assert.equal(result.pokemon.hp - before.hp, result.pokemon.max_hp - before.max_hp, "wounded HP must follow only the max-HP delta");
assert.deepEqual(new Set(result.unsupportedMethods), new Set(["Item", "Trade"]));

const noGrowthMetadata = structuredClone(speciesMasters);
delete noGrowthMetadata.TARGET.growth_rate;
const legacy = resolvePokemonLevelEvolution(before, {
  species_masters: noGrowthMetadata,
  move_masters: moveMasters,
});
assert.equal(legacy.pokemon.level, 20, "fixtures without target growth metadata must keep the pre-existing level contract");

console.log("pokemon-level-evolution target growth-rate recompute smoke: PASS");
