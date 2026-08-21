import assert from "node:assert/strict";
import { resolvePokemonLevelEvolutionWithFieldContext } from "../runtime/pokemon-level-evolution-field-context.js";

const nature_master = { id: "HARDY", stat_changes: [] };
const move_masters = { KEEP: { id: "KEEP", total_pp: 20 } };

function stats(hp = 50) {
  return { HP: hp, ATTACK: 50, DEFENSE: 50, SPECIAL_ATTACK: 50, SPECIAL_DEFENSE: 50, SPEED: 50 };
}

function pokemon(level = 20) {
  return {
    species: "BASE", form: 0, level, exp: level === 20 ? 8000 : 6859,
    hp: 40, max_hp: 50, personal_id: 0x12345678,
    ability_index: 0, ability: "ABILITY", held_item: "LEFTOVERS",
    status: "POISON", status_count: 2, nature_id: "HARDY", nature_for_stats_id: "HARDY",
    iv: { HP: 10, ATTACK: 10, DEFENSE: 10, SPECIAL_ATTACK: 10, SPECIAL_DEFENSE: 10, SPEED: 10 },
    ev: { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 },
    moves: [{ id: "KEEP", pp: 7, total_pp: 20 }], steps_to_hatch: 0,
  };
}

function masters(method) {
  return {
    BASE: {
      id: "BASE", form: 0, growth_rate: "Medium", types: ["NORMAL"],
      base_stats: stats(), abilities: ["ABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
      level_moves: [], evolutions: [["EVOLVED", method, 20, false], ["TRADED", "Trade", null, false]],
    },
    EVOLVED: {
      id: "EVOLVED", form: 0, growth_rate: "Medium", types: ["NORMAL"],
      base_stats: stats(70), abilities: ["EVOLVEDABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
      level_moves: [], evolutions: [],
    },
    TRADED: {
      id: "TRADED", form: 0, growth_rate: "Medium", types: ["NORMAL"],
      base_stats: stats(60), abilities: ["ABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
      level_moves: [], evolutions: [],
    },
  };
}

const cases = [
  ["LevelCycling", { cycling: true }, { cycling: false }],
  ["LevelSurfing", { surfing: true }, { surfing: false }],
  ["LevelDiving", { diving: true }, { diving: false }],
  ["LevelDarkness", { dark_map: true }, { dark_map: false }],
];

for (const [method, matchingContext, mismatchContext] of cases) {
  const species_masters = masters(method);
  const source = pokemon();
  const baseOptions = { nature_master, move_masters, species_masters };

  const deferred = resolvePokemonLevelEvolutionWithFieldContext(source, baseOptions);
  assert.equal(deferred.evolved, false, `${method} must not guess missing field context`);
  assert.deepEqual(deferred.levelEvolutionCandidate, { to: "EVOLVED", method, parameter: 20 });

  const noContext = resolvePokemonLevelEvolutionWithFieldContext(source, { ...baseOptions, party: [source] });
  assert.equal(noContext.evolved, false, `${method} must not evolve without explicit context`);

  const mismatch = resolvePokemonLevelEvolutionWithFieldContext(source, { ...baseOptions, party: [source], ...mismatchContext });
  assert.equal(mismatch.evolved, false, `${method} must reject false context`);

  const low = pokemon(19);
  const belowLevel = resolvePokemonLevelEvolutionWithFieldContext(low, { ...baseOptions, party: [low], ...matchingContext });
  assert.equal(belowLevel.evolved, false, `${method} must still require the configured level`);

  const result = resolvePokemonLevelEvolutionWithFieldContext(source, { ...baseOptions, party: [source], ...matchingContext });
  assert.equal(result.evolved, true, method);
  assert.equal(result.evolution.method, method);
  assert.equal(result.evolution.parameter, 20);
  assert.equal(result.pokemon.species, "EVOLVED");
  assert.equal(result.pokemon.personal_id, 0x12345678);
  assert.equal(result.pokemon.held_item, "LEFTOVERS");
  assert.equal(result.pokemon.status, "POISON");
  assert.equal(result.pokemon.status_count, 2);
  assert.equal(result.pokemon.moves[0].id, "KEEP");
  assert.equal(result.pokemon.moves[0].pp, 7);
  assert.deepEqual(result.unsupportedMethods, ["Trade"]);
  assert.ok(result.operations.some((operation) => operation.op === "level_evolution" && operation.method === method));
}

console.log("canonical field-context level evolution owner: PASS");
