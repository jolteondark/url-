import assert from "node:assert/strict";
import { commitCanonicalPokemonMutationV108 } from "../runtime/mapless-pokemon-mutation-v108.js";

const ZERO = Object.freeze({ HP:0, ATTACK:0, DEFENSE:0, SPECIAL_ATTACK:0, SPECIAL_DEFENSE:0, SPEED:0 });
const pokemon = {
  species:"BULBASAUR",
  level:5,
  personal_id:123,
  gender:0,
  form:0,
  moves:[{ id:"TACKLE", pp:30, ppup:0 }],
  exp:135,
  hp:20,
  status:null,
  status_count:0,
  item:null,
  ability_id:"OVERGROW",
  ability_index:1,
  nature_id:"HARDY",
  nature_for_stats_id:"HARDY",
  ready_to_evolve:true,
  iv:{ ...ZERO },
  ev:{ ...ZERO },
  max_hp:20,
  stats:{ ATTACK:10, DEFENSE:10, SPECIAL_ATTACK:10, SPECIAL_DEFENSE:10, SPEED:10 },
};
const base_stats = { HP:45, ATTACK:49, DEFENSE:49, SPECIAL_ATTACK:65, SPECIAL_DEFENSE:65, SPEED:45 };

const downOne = commitCanonicalPokemonMutationV108(
  pokemon,
  { op:"lower_level", pokemon_index:0, levels:1, minimum_level:1, recalculate_stats:true },
  { base_stats, nature_stat_changes:[], growth_rate:"Parabolic" },
);
assert.equal(downOne.success, true);
assert.equal(downOne.result, "level_lowered");
assert.equal(downOne.previousLevel, 5);
assert.equal(downOne.level, 4);
assert.equal(downOne.pokemon.level, 4);
assert.equal(downOne.pokemon.exp, 96);

const clamp = commitCanonicalPokemonMutationV108(
  { ...pokemon, level:2 },
  { op:"lower_level", pokemon_index:0, levels:3, minimum_level:1, recalculate_stats:true },
  { base_stats, nature_stat_changes:[], growth_rate:"Parabolic" },
);
assert.equal(clamp.success, true);
assert.equal(clamp.level, 1);
assert.equal(clamp.exp, 0);

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
  {
    success:true,
    source:"BULBASAUR",
    target:"IVYSAUR",
    target_form:0,
    base_stats:{ HP:60, ATTACK:62, DEFENSE:63, SPECIAL_ATTACK:80, SPECIAL_DEFENSE:80, SPEED:60 },
    growth_rate:"Parabolic",
    nature_stat_changes:[],
    gender:0,
    ability_id:"OVERGROW",
  },
);
assert.equal(evolve.success, true);
assert.equal(evolve.result, "pokemon_evolved");
assert.equal(evolve.previousSpecies, "BULBASAUR");
assert.equal(evolve.species, "IVYSAUR");
assert.equal(evolve.pokemon.species, "IVYSAUR");
assert.equal(evolve.pokemon.form, 0);
assert.equal(evolve.pokemon.ready_to_evolve, false);
assert.equal(evolve.pokemon.ability_id, "OVERGROW");
assert.deepEqual(evolve.pokemon.moves, pokemon.moves);
assert.notEqual(evolve.pokemon.moves, pokemon.moves);

const missingContext = commitCanonicalPokemonMutationV108(
  pokemon,
  { op:"force_evolve", pokemon_index:0, species:"IVYSAUR" },
  {},
);
assert.equal(missingContext.success, false);
assert.equal(missingContext.result, "force_evolution_context_required");
assert.equal(missingContext.pokemon.species, "BULBASAUR");

const afterEffect = commitCanonicalPokemonMutationV108(
  pokemon,
  { op:"force_evolve", pokemon_index:0, species:"NINJASK" },
  {
    success:true,
    source:"BULBASAUR",
    target:"NINJASK",
    base_stats:{ HP:61, ATTACK:90, DEFENSE:45, SPECIAL_ATTACK:50, SPECIAL_DEFENSE:50, SPEED:160 },
    growth_rate:"Erratic",
    nature_stat_changes:[],
    after_evolution_effect:true,
  },
);
assert.equal(afterEffect.success, false);
assert.equal(afterEffect.result, "evolution_after_effect_owner_required");

console.log("pokemon-mutation-v108-smoke: ok");
