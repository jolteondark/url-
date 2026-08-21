import assert from "node:assert/strict";
import { resolvePokemonLevelEvolutionWithPartyContext } from "../runtime/pokemon-level-evolution-party-context.js";

const moveMasters = {
  KEEP: { id: "KEEP", total_pp: 20 },
};
const natureMaster = { id: "HARDY", stat_changes: [] };
const speciesMasters = {
  PARTYBASE: {
    id: "PARTYBASE",
    form: 0,
    growth_rate: "Medium",
    base_stats: { HP: 50, ATTACK: 50, DEFENSE: 50, SPECIAL_ATTACK: 50, SPECIAL_DEFENSE: 50, SPEED: 50 },
    abilities: ["BASEABILITY"],
    hidden_abilities: [],
    gender_ratio: "Female50Percent",
    level_moves: [],
    evolutions: [
      ["PARTYEVOLVED", "HasInParty", "PARTYKEY", false],
      ["ITEMALT", "Item", "MOONSTONE", false],
    ],
  },
  PARTYEVOLVED: {
    id: "PARTYEVOLVED",
    form: 0,
    growth_rate: "Medium",
    base_stats: { HP: 70, ATTACK: 70, DEFENSE: 65, SPECIAL_ATTACK: 65, SPECIAL_DEFENSE: 65, SPEED: 60 },
    abilities: ["EVOLVEDABILITY"],
    hidden_abilities: [],
    gender_ratio: "Female50Percent",
    level_moves: [],
    evolutions: [],
  },
  PARTYKEY: {
    id: "PARTYKEY",
    form: 0,
    growth_rate: "Medium",
    base_stats: { HP: 40, ATTACK: 40, DEFENSE: 40, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 40, SPEED: 40 },
    abilities: ["KEYABILITY"],
    hidden_abilities: [],
    gender_ratio: "Female50Percent",
    level_moves: [],
    evolutions: [],
  },
};

const pokemon = {
  species: "PARTYBASE",
  form: 0,
  level: 20,
  exp: 8000,
  hp: 41,
  max_hp: 55,
  personal_id: 123456,
  ability_index: 0,
  ability: "BASEABILITY",
  held_item: "LEFTOVERS",
  item: "STALELEGACYITEM",
  status: "PARALYSIS",
  status_count: 0,
  nature_id: "HARDY",
  nature_for_stats_id: "HARDY",
  iv: { HP: 10, ATTACK: 10, DEFENSE: 10, SPECIAL_ATTACK: 10, SPECIAL_DEFENSE: 10, SPEED: 10 },
  ev: { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 },
  moves: [{ id: "KEEP", pp: 7, total_pp: 20 }],
};

const options = {
  species_masters: speciesMasters,
  nature_master: natureMaster,
  move_masters: moveMasters,
};

const probe = resolvePokemonLevelEvolutionWithPartyContext(pokemon, options);
assert.equal(probe.evolved, false);
assert.deepEqual(probe.levelEvolutionCandidate, { to: "PARTYEVOLVED", method: "HasInParty", parameter: "PARTYKEY" });
assert.ok(probe.unsupportedMethods.includes("HasInParty"));
assert.ok(probe.unsupportedMethods.includes("Item"));

const absent = resolvePokemonLevelEvolutionWithPartyContext(pokemon, { ...options, party: [pokemon] });
assert.equal(absent.evolved, false);
assert.equal(absent.levelEvolutionCandidate, null);
assert.ok(!absent.unsupportedMethods.includes("HasInParty"));
assert.ok(absent.unsupportedMethods.includes("Item"));
assert.equal(absent.pokemon.species, "PARTYBASE");

const companion = { species: "PARTYKEY", hp: 10, max_hp: 10 };
const evolved = resolvePokemonLevelEvolutionWithPartyContext(pokemon, { ...options, party: [pokemon, companion] });
assert.equal(evolved.evolved, true);
assert.equal(evolved.evolution.method, "HasInParty");
assert.equal(evolved.evolution.parameter, "PARTYKEY");
assert.equal(evolved.pokemon.species, "PARTYEVOLVED");
assert.equal(evolved.pokemon.personal_id, pokemon.personal_id);
assert.equal(evolved.pokemon.held_item, "LEFTOVERS");
assert.equal(evolved.pokemon.status, "PARALYSIS");
assert.equal(evolved.pokemon.moves[0].id, "KEEP");
assert.equal(evolved.pokemon.moves[0].pp, 7);
assert.ok(!evolved.unsupportedMethods.includes("HasInParty"));
assert.ok(evolved.unsupportedMethods.includes("Item"));
assert.ok(evolved.operations.some((operation) => operation.op === "level_evolution" && operation.method === "HasInParty"));

console.log("pokemon-level-evolution-has-in-party-smoke: PASS");
