import assert from "node:assert/strict";
import { commitCanonicalPokemonMutationV108 } from "../runtime/mapless-pokemon-mutation-v108.js";

const ZERO = Object.freeze({ HP:0, ATTACK:0, DEFENSE:0, SPECIAL_ATTACK:0, SPECIAL_DEFENSE:0, SPEED:0 });
const pokemon = {
  species:"BULBASAUR",
  level:5,
  personal_id:123,
  gender:0,
  form:0,
  moves:[],
  exp:125,
  hp:20,
  status:null,
  status_count:0,
  item:null,
  ability_id:"OVERGROW",
  nature_id:"HARDY",
  nature_for_stats_id:"HARDY",
  iv:{ ...ZERO },
  ev:{ ...ZERO },
  max_hp:20,
  stats:{ ATTACK:10, DEFENSE:10, SPECIAL_ATTACK:10, SPECIAL_DEFENSE:10, SPEED:10 },
};
const base_stats = { HP:45, ATTACK:49, DEFENSE:49, SPECIAL_ATTACK:65, SPECIAL_DEFENSE:65, SPEED:45 };

const downOne = commitCanonicalPokemonMutationV108(
  pokemon,
  { op:"lower_level", pokemon_index:0, levels:1, minimum_level:1, recalculate_stats:true },
  { base_stats, nature_stat_changes:[] },
);
assert.equal(downOne.success, true);
assert.equal(downOne.result, "level_lowered");
assert.equal(downOne.previousLevel, 5);
assert.equal(downOne.level, 4);
assert.equal(downOne.pokemon.level, 4);
assert.equal(downOne.pokemon.max_hp, 15);

const clamp = commitCanonicalPokemonMutationV108(
  { ...pokemon, level:2 },
  { op:"lower_level", pokemon_index:0, levels:3, minimum_level:1, recalculate_stats:true },
  { base_stats, nature_stat_changes:[] },
);
assert.equal(clamp.success, true);
assert.equal(clamp.level, 1);

const missingStats = commitCanonicalPokemonMutationV108(
  pokemon,
  { op:"lower_level", levels:1, minimum_level:1, recalculate_stats:true },
);
assert.equal(missingStats.success, false);
assert.equal(missingStats.result, "base_stats_required");
assert.equal(missingStats.pokemon.level, 5);

const evolve = commitCanonicalPokemonMutationV108(
  pokemon,
  { op:"force_evolve", pokemon_index:0, species:"IVYSAUR" },
  { base_stats },
);
assert.equal(evolve.success, false);
assert.equal(evolve.result, "force_evolve_owner_unavailable");
assert.equal(evolve.pokemon.species, "BULBASAUR");

console.log("pokemon-mutation-v108-smoke: ok");
