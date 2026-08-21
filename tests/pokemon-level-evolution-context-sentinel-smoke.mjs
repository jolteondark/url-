import assert from "node:assert/strict";
import { resolvePokemonLevelEvolution } from "../runtime/pokemon-level-evolution-runtime.js";
import { resolvePokemonLevelEvolutionWithPartyContext } from "../runtime/pokemon-level-evolution-party-context.js";

const moveMasters = { KEEP: { id: "KEEP", total_pp: 20 } };
const natureMaster = { id: "HARDY", stat_changes: [] };

function masters(method, parameter) {
  return {
    BASE: {
      id: "BASE", form: 0, growth_rate: "Medium",
      base_stats: { HP: 50, ATTACK: 50, DEFENSE: 50, SPECIAL_ATTACK: 50, SPECIAL_DEFENSE: 50, SPEED: 50 },
      abilities: ["BASEABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
      level_moves: [], evolutions: [["EVOLVED", method, parameter, false], ["TRADEALT", "Trade", null, false]],
    },
    EVOLVED: {
      id: "EVOLVED", form: 0, growth_rate: "Medium",
      base_stats: { HP: 70, ATTACK: 70, DEFENSE: 65, SPECIAL_ATTACK: 65, SPECIAL_DEFENSE: 65, SPEED: 60 },
      abilities: ["EVOLVEDABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
      level_moves: [], evolutions: [],
    },
    KEY: {
      id: "KEY", form: 0, growth_rate: "Medium",
      base_stats: { HP: 40, ATTACK: 40, DEFENSE: 40, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 40, SPEED: 40 },
      abilities: ["KEYABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
      level_moves: [], evolutions: [],
    },
  };
}

function pokemon() {
  return {
    species: "BASE", form: 0, level: 20, exp: 8000,
    hp: 41, max_hp: 55, personal_id: 123456,
    ability_index: 0, ability: "BASEABILITY",
    held_item: "LEFTOVERS", item: "STALELEGACYITEM",
    status: "PARALYSIS", status_count: 0,
    nature_id: "HARDY", nature_for_stats_id: "HARDY",
    iv: { HP: 10, ATTACK: 10, DEFENSE: 10, SPECIAL_ATTACK: 10, SPECIAL_DEFENSE: 10, SPEED: 10 },
    ev: { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 },
    moves: [{ id: "KEEP", pp: 7, total_pp: 20 }],
  };
}

const common = { nature_master: natureMaster, move_masters: moveMasters };

{
  const species_masters = masters("HasInParty", "KEY");
  const source = pokemon();
  const companion = { species: "KEY", hp: 10, max_hp: 10 };
  const result = resolvePokemonLevelEvolutionWithPartyContext(source, {
    ...common, species_masters, party: [source, companion],
  });
  assert.equal(result.evolved, true, "satisfied HasInParty must cross the reserved Level sentinel bridge");
  assert.equal(result.evolution.method, "HasInParty");
  assert.equal(result.evolution.parameter, "KEY");
  assert.equal(result.pokemon.species, "EVOLVED");
  assert.equal(result.pokemon.personal_id, source.personal_id);
  assert.equal(result.pokemon.held_item, "LEFTOVERS");
  assert.equal(result.pokemon.status, "PARALYSIS");
  assert.equal(result.pokemon.moves[0].pp, 7);
  assert.ok(!result.unsupportedMethods.includes("HasInParty"));
  assert.ok(result.unsupportedMethods.includes("Trade"));
}

{
  const species_masters = masters("LevelDay", 20);
  const source = pokemon();
  const result = resolvePokemonLevelEvolutionWithPartyContext(source, {
    ...common, species_masters, party: [source], time_hour: 12,
  });
  assert.equal(result.evolved, true, "satisfied LevelDay must cross the reserved Level sentinel bridge");
  assert.equal(result.evolution.method, "LevelDay");
  assert.equal(result.evolution.parameter, 20);
  assert.equal(result.pokemon.personal_id, source.personal_id);
  assert.equal(result.pokemon.held_item, "LEFTOVERS");
  assert.equal(result.pokemon.moves[0].pp, 7);
}

{
  const species_masters = masters("Level", -2);
  const source = pokemon();
  const result = resolvePokemonLevelEvolution(source, { ...common, species_masters });
  assert.equal(result.evolved, false, "ordinary invalid negative canonical Level must remain rejected");
  assert.equal(result.levelEvolutionCandidate, null);
}

console.log("pokemon-level-evolution-context-sentinel-smoke: PASS");