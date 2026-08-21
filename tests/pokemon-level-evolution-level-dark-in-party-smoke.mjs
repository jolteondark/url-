import assert from "node:assert/strict";
import { resolvePokemonLevelEvolutionWithPartyContext } from "../runtime/pokemon-level-evolution-party-context.js";

const moveMasters = { KEEP: { id: "KEEP", total_pp: 20 } };
const natureMaster = { id: "HARDY", stat_changes: [] };
const speciesMasters = {
  DARKBASE: {
    id: "DARKBASE", form: 0, types: ["FIGHTING"], growth_rate: "Medium",
    base_stats: { HP: 50, ATTACK: 50, DEFENSE: 50, SPECIAL_ATTACK: 50, SPECIAL_DEFENSE: 50, SPEED: 50 },
    abilities: ["BASEABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
    level_moves: [],
    evolutions: [
      ["DARKEVOLVED", "LevelDarkInParty", 32, false],
      ["TRADEALT", "Trade", null, false],
    ],
  },
  DARKEVOLVED: {
    id: "DARKEVOLVED", form: 0, types: ["FIGHTING", "DARK"], growth_rate: "Medium",
    base_stats: { HP: 70, ATTACK: 75, DEFENSE: 65, SPECIAL_ATTACK: 60, SPECIAL_DEFENSE: 65, SPEED: 60 },
    abilities: ["EVOLVEDABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
    level_moves: [], evolutions: [],
  },
  DARKALLY: {
    id: "DARKALLY", form: 0, types: ["DARK"], growth_rate: "Medium",
    base_stats: { HP: 40, ATTACK: 40, DEFENSE: 40, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 40, SPEED: 40 },
    abilities: ["ALLYABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
    level_moves: [], evolutions: [],
  },
  LIGHTALLY: {
    id: "LIGHTALLY", form: 0, types: ["NORMAL"], growth_rate: "Medium",
    base_stats: { HP: 40, ATTACK: 40, DEFENSE: 40, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 40, SPEED: 40 },
    abilities: ["ALLYABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
    level_moves: [], evolutions: [],
  },
};

function makePokemon(level = 32) {
  return {
    species: "DARKBASE", form: 0, level, exp: level === 31 ? 29791 : 32768,
    hp: 41, max_hp: 55, personal_id: 123456, ability_index: 0, ability: "BASEABILITY",
    held_item: "LEFTOVERS", item: "STALELEGACYITEM", status: "PARALYSIS", status_count: 0,
    nature_id: "HARDY", nature_for_stats_id: "HARDY",
    iv: { HP: 10, ATTACK: 10, DEFENSE: 10, SPECIAL_ATTACK: 10, SPECIAL_DEFENSE: 10, SPEED: 10 },
    ev: { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 },
    moves: [{ id: "KEEP", pp: 7, total_pp: 20 }],
  };
}
const options = { species_masters: speciesMasters, nature_master: natureMaster, move_masters: moveMasters };

const below = resolvePokemonLevelEvolutionWithPartyContext(makePokemon(31), options);
assert.equal(below.evolved, false);
assert.equal(below.levelEvolutionCandidate, null);
assert.ok(below.unsupportedMethods.includes("LevelDarkInParty"));
assert.ok(below.unsupportedMethods.includes("Trade"));

const probe = resolvePokemonLevelEvolutionWithPartyContext(makePokemon(), options);
assert.equal(probe.evolved, false);
assert.deepEqual(probe.levelEvolutionCandidate, { to: "DARKEVOLVED", method: "LevelDarkInParty", parameter: 32 });
assert.ok(probe.unsupportedMethods.includes("LevelDarkInParty"));

const absent = resolvePokemonLevelEvolutionWithPartyContext(makePokemon(), {
  ...options,
  party: [makePokemon(), { species: "LIGHTALLY", hp: 10, max_hp: 10 }],
});
assert.equal(absent.evolved, false);
assert.equal(absent.levelEvolutionCandidate, null);
assert.ok(!absent.unsupportedMethods.includes("LevelDarkInParty"));
assert.ok(absent.unsupportedMethods.includes("Trade"));

const pokemon = makePokemon();
const evolved = resolvePokemonLevelEvolutionWithPartyContext(pokemon, {
  ...options,
  party: [pokemon, { species: "DARKALLY", hp: 10, max_hp: 10 }],
});
assert.equal(evolved.evolved, true);
assert.equal(evolved.evolution.method, "LevelDarkInParty");
assert.equal(evolved.evolution.parameter, 32);
assert.equal(evolved.pokemon.species, "DARKEVOLVED");
assert.equal(evolved.pokemon.personal_id, pokemon.personal_id);
assert.equal(evolved.pokemon.held_item, "LEFTOVERS");
assert.equal(evolved.pokemon.status, "PARALYSIS");
assert.equal(evolved.pokemon.moves[0].id, "KEEP");
assert.equal(evolved.pokemon.moves[0].pp, 7);
assert.ok(!evolved.unsupportedMethods.includes("LevelDarkInParty"));
assert.ok(evolved.unsupportedMethods.includes("Trade"));
assert.ok(evolved.operations.some((operation) =>
  operation.op === "level_evolution" && operation.method === "LevelDarkInParty"));

console.log("pokemon-level-evolution-level-dark-in-party-smoke: PASS");
