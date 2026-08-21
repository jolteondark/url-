import assert from "node:assert/strict";
import { resolvePokemonLevelEvolutionWithPartyContext } from "../runtime/pokemon-level-evolution-party-context.js";

const moveMasters = { KEEP: { id: "KEEP", total_pp: 20 } };
const natureMaster = { id: "HARDY", stat_changes: [] };

function speciesMasters(method) {
  return {
    ITEMBASE: {
      id: "ITEMBASE", form: 0, growth_rate: "Medium",
      base_stats: { HP: 50, ATTACK: 50, DEFENSE: 50, SPECIAL_ATTACK: 50, SPECIAL_DEFENSE: 50, SPEED: 50 },
      abilities: ["SAMEABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
      level_moves: [],
      evolutions: [
        ["ITEMEVOLVED", method, "DAYSTONE", false],
        ["TRADEALT", "Trade", null, false],
      ],
    },
    ITEMEVOLVED: {
      id: "ITEMEVOLVED", form: 0, growth_rate: "Medium",
      base_stats: { HP: 70, ATTACK: 75, DEFENSE: 65, SPECIAL_ATTACK: 60, SPECIAL_DEFENSE: 65, SPEED: 60 },
      abilities: ["SAMEABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
      level_moves: [], evolutions: [],
    },
  };
}

function makePokemon(heldItem = "DAYSTONE") {
  return {
    species: "ITEMBASE", form: 0, level: 20, exp: 8000,
    hp: 41, max_hp: 55, personal_id: 123456, ability_index: 0, ability: "SAMEABILITY",
    held_item: heldItem, item: "STALELEGACYITEM", status: "PARALYSIS", status_count: 0,
    nature_id: "HARDY", nature_for_stats_id: "HARDY",
    iv: { HP: 10, ATTACK: 10, DEFENSE: 10, SPECIAL_ATTACK: 10, SPECIAL_DEFENSE: 10, SPEED: 10 },
    ev: { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 },
    moves: [{ id: "KEEP", pp: 7, total_pp: 20 }],
  };
}

for (const [method, matchingHour, nonMatchingHour] of [["DayHoldItem", 12, 22], ["NightHoldItem", 22, 12]]) {
  const masters = speciesMasters(method);
  const options = { species_masters: masters, nature_master: natureMaster, move_masters: moveMasters };

  const wrongItem = makePokemon("OTHERITEM");
  const wrongProbe = resolvePokemonLevelEvolutionWithPartyContext(wrongItem, options);
  assert.equal(wrongProbe.evolved, false, `${method} rejects wrong held item during probe`);
  assert.equal(wrongProbe.levelEvolutionCandidate, null);
  assert.equal(wrongProbe.pokemon.held_item, "OTHERITEM");

  const probePokemon = makePokemon();
  const probe = resolvePokemonLevelEvolutionWithPartyContext(probePokemon, options);
  assert.equal(probe.evolved, false, `${method} probe must defer time context`);
  assert.deepEqual(probe.levelEvolutionCandidate, { to: "ITEMEVOLVED", method, parameter: "DAYSTONE" });
  assert.ok(probe.unsupportedMethods.includes(method));
  assert.ok(probe.unsupportedMethods.includes("Trade"));

  const rejectedPokemon = makePokemon();
  const rejected = resolvePokemonLevelEvolutionWithPartyContext(rejectedPokemon, {
    ...options, party: [rejectedPokemon], time_hour: nonMatchingHour,
  });
  assert.equal(rejected.evolved, false, `${method} rejects wrong time`);
  assert.equal(rejected.levelEvolutionCandidate, null);
  assert.equal(rejected.pokemon.species, "ITEMBASE");
  assert.equal(rejected.pokemon.held_item, "DAYSTONE", `${method} preserves item when evolution fails`);
  assert.equal(rejected.pokemon.item, "STALELEGACYITEM");
  assert.ok(!rejected.unsupportedMethods.includes(method));
  assert.ok(rejected.unsupportedMethods.includes("Trade"));

  const pokemon = makePokemon();
  const evolved = resolvePokemonLevelEvolutionWithPartyContext(pokemon, {
    ...options, party: [pokemon], time_hour: matchingHour,
  });
  assert.equal(evolved.evolved, true, `${method} evolves at matching time`);
  assert.equal(evolved.evolution.method, method);
  assert.equal(evolved.evolution.parameter, "DAYSTONE");
  assert.equal(evolved.pokemon.species, "ITEMEVOLVED");
  assert.equal(evolved.pokemon.personal_id, pokemon.personal_id);
  assert.equal(evolved.pokemon.held_item, null, `${method} consumes authoritative held item only on success`);
  assert.equal(evolved.pokemon.item, null);
  assert.equal(evolved.pokemon.status, "PARALYSIS");
  assert.equal(evolved.pokemon.moves[0].id, "KEEP");
  assert.equal(evolved.pokemon.moves[0].pp, 7);
  assert.ok(!evolved.unsupportedMethods.includes(method));
  assert.ok(evolved.unsupportedMethods.includes("Trade"));
  assert.ok(evolved.operations.some((operation) =>
    operation.op === "level_evolution" && operation.method === method));
  assert.ok(evolved.operations.some((operation) =>
    operation.op === "consume_evolution_item" && operation.item === "DAYSTONE"));
}

console.log("pokemon-level-evolution-day-night-hold-item-context-smoke: PASS");
