import assert from "node:assert/strict";
import { resolvePokemonLevelEvolutionWithPartyContext } from "../runtime/pokemon-level-evolution-party-context.js";

const moveMasters = { KEEP: { id: "KEEP", total_pp: 20 } };
const natureMaster = { id: "HARDY", stat_changes: [] };

function speciesMasters(method) {
  return {
    HAPPYBASE: {
      id: "HAPPYBASE", form: 0, growth_rate: "Medium",
      base_stats: { HP: 50, ATTACK: 50, DEFENSE: 50, SPECIAL_ATTACK: 50, SPECIAL_DEFENSE: 50, SPEED: 50 },
      abilities: ["SAMEABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
      level_moves: [],
      evolutions: [
        ["HAPPYEVOLVED", method, null, false],
        ["TRADEALT", "Trade", null, false],
      ],
    },
    HAPPYEVOLVED: {
      id: "HAPPYEVOLVED", form: 0, growth_rate: "Medium",
      base_stats: { HP: 70, ATTACK: 75, DEFENSE: 65, SPECIAL_ATTACK: 60, SPECIAL_DEFENSE: 65, SPEED: 60 },
      abilities: ["SAMEABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
      level_moves: [], evolutions: [],
    },
  };
}

function makePokemon(happiness = 220) {
  return {
    species: "HAPPYBASE", form: 0, level: 20, exp: 8000, happiness,
    hp: 41, max_hp: 55, personal_id: 123456, ability_index: 0, ability: "SAMEABILITY",
    held_item: "LEFTOVERS", item: "STALELEGACYITEM", status: "PARALYSIS", status_count: 0,
    nature_id: "HARDY", nature_for_stats_id: "HARDY",
    iv: { HP: 10, ATTACK: 10, DEFENSE: 10, SPECIAL_ATTACK: 10, SPECIAL_DEFENSE: 10, SPEED: 10 },
    ev: { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 },
    moves: [{ id: "KEEP", pp: 7, total_pp: 20 }],
  };
}

for (const [method, matchingHour, nonMatchingHour] of [["HappinessDay", 12, 22], ["HappinessNight", 22, 12]]) {
  const masters = speciesMasters(method);
  const options = { species_masters: masters, nature_master: natureMaster, move_masters: moveMasters };

  const below = resolvePokemonLevelEvolutionWithPartyContext(makePokemon(219), options);
  assert.equal(below.evolved, false, `${method} below happiness threshold`);
  assert.equal(below.levelEvolutionCandidate, null, `${method} below-threshold probe`);
  assert.ok(below.unsupportedMethods.includes(method), `${method} remains explicit while context is absent`);

  const probePokemon = makePokemon();
  const probe = resolvePokemonLevelEvolutionWithPartyContext(probePokemon, options);
  assert.equal(probe.evolved, false, `${method} probe must defer`);
  assert.deepEqual(probe.levelEvolutionCandidate, { to: "HAPPYEVOLVED", method, parameter: null });
  assert.ok(probe.unsupportedMethods.includes(method));
  assert.ok(probe.unsupportedMethods.includes("Trade"));

  const rejectedPokemon = makePokemon();
  const rejected = resolvePokemonLevelEvolutionWithPartyContext(rejectedPokemon, {
    ...options, party: [rejectedPokemon], time_hour: nonMatchingHour,
  });
  assert.equal(rejected.evolved, false, `${method} rejects wrong time`);
  assert.equal(rejected.levelEvolutionCandidate, null);
  assert.ok(!rejected.unsupportedMethods.includes(method));
  assert.ok(rejected.unsupportedMethods.includes("Trade"));
  assert.equal(rejected.pokemon.species, "HAPPYBASE");
  assert.equal(rejected.pokemon.happiness, 220);

  const pokemon = makePokemon();
  const evolved = resolvePokemonLevelEvolutionWithPartyContext(pokemon, {
    ...options, party: [pokemon], time_hour: matchingHour,
  });
  assert.equal(evolved.evolved, true, `${method} evolves at matching time`);
  assert.equal(evolved.evolution.method, method);
  assert.equal(evolved.evolution.parameter, null);
  assert.equal(evolved.pokemon.species, "HAPPYEVOLVED");
  assert.equal(evolved.pokemon.personal_id, pokemon.personal_id);
  assert.equal(evolved.pokemon.happiness, 220);
  assert.equal(evolved.pokemon.held_item, "LEFTOVERS");
  assert.equal(evolved.pokemon.status, "PARALYSIS");
  assert.equal(evolved.pokemon.moves[0].id, "KEEP");
  assert.equal(evolved.pokemon.moves[0].pp, 7);
  assert.ok(!evolved.unsupportedMethods.includes(method));
  assert.ok(evolved.unsupportedMethods.includes("Trade"));
  assert.ok(evolved.operations.some((operation) =>
    operation.op === "level_evolution" && operation.method === method));
}

console.log("pokemon-level-evolution-happiness-time-context-smoke: PASS");
