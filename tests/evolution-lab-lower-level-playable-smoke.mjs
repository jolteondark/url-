import assert from "node:assert/strict";
import { resolveEvolutionLabPokemonStatContextV108 } from "../runtime/mapless-evolution-lab-stat-context-v108.js";
import { commitCanonicalPokemonMutationV108 } from "../runtime/mapless-pokemon-mutation-v108.js";
import { safariEvolutionLabPresentation, resolveSafariEvolutionLabInteraction } from "../runtime/safari-evolution-lab-interaction.js";

const zeroStats = () => ({ HP:0, ATTACK:0, DEFENSE:0, SPECIAL_ATTACK:0, SPECIAL_DEFENSE:0, SPEED:0 });
const bulbasaur = {
  species:"BULBASAUR",
  level:10,
  personal_id:12345,
  gender:0,
  form:0,
  moves:[],
  exp:560,
  hp:29,
  status:null,
  status_count:0,
  item:null,
  ability_id:null,
  nature_id:"MODEST",
  iv:zeroStats(),
  ev:zeroStats(),
  max_hp:29,
  stats:{ ATTACK:12, DEFENSE:14, SPECIAL_ATTACK:18, SPECIAL_DEFENSE:18, SPEED:13 },
};

const context = resolveEvolutionLabPokemonStatContextV108(bulbasaur);
assert.equal(context.success, true);
assert.equal(context.growth_rate, "Parabolic");
assert.deepEqual(context.base_stats, { HP:45, ATTACK:49, DEFENSE:49, SPECIAL_ATTACK:65, SPECIAL_DEFENSE:65, SPEED:45 });
assert.deepEqual(context.nature_stat_changes, [["SPECIAL_ATTACK",10],["ATTACK",-10]]);

const lowered = commitCanonicalPokemonMutationV108(
  bulbasaur,
  { op:"lower_level", pokemon_index:0, levels:3, minimum_level:1, recalculate_stats:true },
  context,
);
assert.equal(lowered.success, true);
assert.equal(lowered.previousLevel, 10);
assert.equal(lowered.level, 7);
assert.equal(lowered.pokemon.level, 7);
assert.equal(lowered.pokemon.exp, 236);
assert.ok(lowered.pokemon.max_hp > 0);

const runtime = {
  variables:{ mapless:{
    board_events:[{ kind:"normal_event", normal_event_id:"evolution_lab", normal_seed:5, normal_resolved:false, normal_data:{} }],
    board_revealed:[false],
    board_visited:[false],
    board_consumed:[false],
    last_operations:[],
    battle:null,
    shop:null,
  } },
  player:{ party:[structuredClone(bulbasaur)] },
  bag:{ slots:[], max_slots:20, max_per_slot:99 },
};

const presentation = safariEvolutionLabPresentation(runtime, 0);
assert.equal(presentation.actions.find((entry) => entry.id === "maximum")?.disabled, false);

// Ruby Random.new(5).rand(100) == 99 in canonical v0.9.108, so Maximum lowers 3 levels.
const result = resolveSafariEvolutionLabInteraction(runtime, 0, { id:"maximum", pokemon_index:0, species:"IVYSAUR" });
assert.equal(result.result, "level_down_3");
assert.equal(result.completed, true);
assert.equal(result.terminal, true);
assert.equal(result.persistenceRequested, true);
assert.equal(runtime.player.party[0].level, 7);
assert.equal(runtime.player.party[0].exp, 236);
assert.equal(runtime.variables.mapless.board_consumed[0], true);
assert.ok(result.operations.some((operation) => operation.op === "commit_pokemon_mutation" && operation.level === 7));
assert.ok(result.operations.some((operation) => operation.op === "request_save" && operation.reason === "evolution_lab_level_down_3"));

console.log("evolution-lab-lower-level-playable-smoke: ok");
