import assert from "node:assert/strict";
import { resolvePokemonLevelEvolutionWithPartyContext } from "../runtime/pokemon-level-evolution-party-context.js";

const natureMaster = { id: "HARDY", stat_changes: [] };
const moveMasters = { KEEP: { id: "KEEP", total_pp: 20 } };

function basePokemon(species = "BASE") {
  return {
    species,
    form: 0,
    level: 20,
    exp: 8000,
    hp: 40,
    max_hp: 50,
    personal_id: 123456,
    ability_index: 0,
    ability: "ABILITY",
    held_item: "LEFTOVERS",
    status: null,
    status_count: 0,
    nature_id: "HARDY",
    nature_for_stats_id: "HARDY",
    iv: { HP: 10, ATTACK: 10, DEFENSE: 10, SPECIAL_ATTACK: 10, SPECIAL_DEFENSE: 10, SPEED: 10 },
    ev: { HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 },
    moves: [{ id: "KEEP", pp: 7, total_pp: 20 }],
    steps_to_hatch: 0,
  };
}

function speciesMasters(method, parameter) {
  return {
    BASE: {
      id: "BASE", form: 0, growth_rate: "Medium", types: ["NORMAL"],
      base_stats: { HP: 50, ATTACK: 50, DEFENSE: 50, SPECIAL_ATTACK: 50, SPECIAL_DEFENSE: 50, SPEED: 50 },
      abilities: ["ABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
      level_moves: [], evolutions: [["EVOLVED", method, parameter, false]],
    },
    EVOLVED: {
      id: "EVOLVED", form: 0, growth_rate: "Medium", types: ["NORMAL"],
      base_stats: { HP: 70, ATTACK: 70, DEFENSE: 65, SPECIAL_ATTACK: 65, SPECIAL_DEFENSE: 65, SPEED: 60 },
      abilities: ["EVOLVEDABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
      level_moves: [], evolutions: [],
    },
    KEY: {
      id: "KEY", form: 0, growth_rate: "Medium", types: ["NORMAL"],
      base_stats: { HP: 40, ATTACK: 40, DEFENSE: 40, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 40, SPEED: 40 },
      abilities: ["KEYABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
      level_moves: [], evolutions: [],
    },
    DARKKEY: {
      id: "DARKKEY", form: 0, growth_rate: "Medium", types: ["DARK"],
      base_stats: { HP: 40, ATTACK: 40, DEFENSE: 40, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 40, SPEED: 40 },
      abilities: ["KEYABILITY"], hidden_abilities: [], gender_ratio: "Female50Percent",
      level_moves: [], evolutions: [],
    },
  };
}

const common = { nature_master: natureMaster, move_masters: moveMasters };

{
  const species_masters = speciesMasters("HasInParty", "KEY");
  const source = basePokemon();
  const egg = { ...basePokemon("KEY"), steps_to_hatch: 20 };
  const blocked = resolvePokemonLevelEvolutionWithPartyContext(source, {
    ...common, species_masters, party: [source, egg],
  });
  assert.equal(blocked.evolved, false, "HasInParty must ignore eggs, matching Trainer#pokemon_party");
  assert.equal(blocked.pokemon.species, "BASE");

  const hatched = { ...egg, steps_to_hatch: 0 };
  const evolved = resolvePokemonLevelEvolutionWithPartyContext(source, {
    ...common, species_masters, party: [source, hatched],
  });
  assert.equal(evolved.evolved, true, "hatched party member must satisfy HasInParty");
  assert.equal(evolved.evolution.method, "HasInParty");
}

{
  const species_masters = speciesMasters("LevelDarkInParty", 20);
  const source = basePokemon();
  const darkEgg = { ...basePokemon("DARKKEY"), steps_to_hatch: 20 };
  const blocked = resolvePokemonLevelEvolutionWithPartyContext(source, {
    ...common, species_masters, party: [source, darkEgg],
  });
  assert.equal(blocked.evolved, false, "LevelDarkInParty must ignore DARK-type eggs");

  const hatchedDark = { ...darkEgg, steps_to_hatch: 0 };
  const evolved = resolvePokemonLevelEvolutionWithPartyContext(source, {
    ...common, species_masters, party: [source, hatchedDark],
  });
  assert.equal(evolved.evolved, true, "hatched DARK-type party member must satisfy LevelDarkInParty");
  assert.equal(evolved.evolution.method, "LevelDarkInParty");
}

console.log("pokemon-level-evolution-party-context-eggs-smoke: PASS");
