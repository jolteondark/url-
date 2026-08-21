import assert from "node:assert/strict";
import { resolvePokemonLevelEvolutionWithPartyContext } from "../runtime/pokemon-level-evolution-party-context.js";

const nature_master = { id: "HARDY", stat_changes: [] };
const move_masters = { KEEP: { id: "KEEP", total_pp: 20 } };

function pokemon(level = 20) {
  return {
    species: "BASE", form: 0, level, exp: level === 20 ? 8000 : 6859,
    hp: 40, max_hp: 50, personal_id: 987654321,
    ability_index: 0, ability: "ABILITY", held_item: "LEFTOVERS",
    status: null, status_count: 0, nature_id: "HARDY", nature_for_stats_id: "HARDY",
    iv: { HP: 10, ATTACK: 10, DEFENSE: 10, SPECIAL_ATTACK: 10, SPECIAL_DEFENSE: 10, SPEED: 10 },
    ev: { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 },
    moves: [{ id: "KEEP", pp: 7, total_pp: 20 }], steps_to_hatch: 0,
  };
}

function masters(method) {
  return {
    BASE: {
      id: "BASE", form: 0, growth_rate: "Medium", types: ["NORMAL"],
      base_stats: { HP: 50, ATTACK: 50, DEFENSE: 50, SPECIAL_ATTACK: 50, SPECIAL_DEFENSE: 50, SPEED: 50 },
      abilities: ["ABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
      level_moves: [], evolutions: [["EVOLVED", method, 20, false]],
    },
    EVOLVED: {
      id: "EVOLVED", form: 0, growth_rate: "Medium", types: ["NORMAL"],
      base_stats: { HP: 70, ATTACK: 70, DEFENSE: 65, SPECIAL_ATTACK: 65, SPECIAL_DEFENSE: 65, SPEED: 60 },
      abilities: ["EVOLVEDABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
      level_moves: [], evolutions: [],
    },
  };
}

const cases = [
  ["LevelNoWeather", "None", "Rain"],
  ["LevelSun", "Sun", "Rain"],
  ["LevelSun", "HarshSun", "Rain"],
  ["LevelRain", "Rain", "Sun"],
  ["LevelRain", "HeavyRain", "Sun"],
  ["LevelRain", "Fog", "Sun"],
  ["LevelSnow", "Hail", "Rain"],
  ["LevelSandstorm", "Sandstorm", "Sun"],
];

for (const [method, matching, mismatch] of cases) {
  const species_masters = masters(method);
  const source = pokemon();
  const baseOptions = { nature_master, move_masters, species_masters, party: [source] };

  assert.equal(resolvePokemonLevelEvolutionWithPartyContext(source, baseOptions).evolved, false);
  assert.equal(resolvePokemonLevelEvolutionWithPartyContext(source, { ...baseOptions, weather_type: mismatch }).evolved, false);
  const low = pokemon(19);
  assert.equal(resolvePokemonLevelEvolutionWithPartyContext(low, { ...baseOptions, party: [low], weather_type: matching }).evolved, false);

  const result = resolvePokemonLevelEvolutionWithPartyContext(source, { ...baseOptions, weather_type: matching });
  assert.equal(result.evolved, true, method);
  assert.equal(result.evolution.method, method);
  assert.equal(result.pokemon.species, "EVOLVED");
  assert.equal(result.pokemon.personal_id, source.personal_id);
  assert.equal(result.pokemon.held_item, source.held_item);
  assert.equal(result.pokemon.moves[0].pp, 7);
}

console.log("pokemon-level-evolution-weather-context-smoke: PASS");
