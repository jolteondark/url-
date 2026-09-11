import assert from "node:assert/strict";
import { resolveCanonicalEvolutionLabV108 } from "../runtime/mapless-evolution-lab-v108.js";
import { resolveEvolutionLabForceEvolutionContextV108 } from "../runtime/mapless-evolution-lab-force-evolution-context-v108.js";
import { resolveSafariEvolutionLabInteraction } from "../runtime/safari-evolution-lab-interaction.js";

const ZERO = Object.freeze({ HP:0, ATTACK:0, DEFENSE:0, SPECIAL_ATTACK:0, SPECIAL_DEFENSE:0, SPEED:0 });
const bulbasaur = {
  species:"BULBASAUR",
  level:5,
  personal_id:122,
  gender:0,
  form:0,
  moves:[{ id:"TACKLE", pp:30, ppup:0 }],
  exp:135,
  hp:20,
  status:null,
  status_count:0,
  item:null,
  ability_id:"OVERGROW",
  ability_index:0,
  nature_id:"HARDY",
  nature_for_stats_id:"HARDY",
  ready_to_evolve:true,
  iv:{ ...ZERO },
  ev:{ ...ZERO },
  max_hp:20,
  stats:{ ATTACK:10, DEFENSE:10, SPECIAL_ATTACK:10, SPECIAL_DEFENSE:10, SPEED:10 },
};

const hydrated = resolveEvolutionLabForceEvolutionContextV108(
  bulbasaur,
  { op:"force_evolve", pokemon_index:0, species:"IVYSAUR" },
);
assert.equal(hydrated.success, true);
assert.equal(hydrated.source, "BULBASAUR");
assert.equal(hydrated.target, "IVYSAUR");
assert.equal(hydrated.target_form, 0);
assert.equal(hydrated.growth_rate, "Parabolic");
assert.equal(hydrated.ability_id, "OVERGROW");
assert.equal(hydrated.gender, 0);
assert.deepEqual(hydrated.base_stats, {
  HP:60, ATTACK:62, DEFENSE:63, SPECIAL_ATTACK:80, SPECIAL_DEFENSE:80, SPEED:60,
});

const hidden = resolveEvolutionLabForceEvolutionContextV108(
  { ...bulbasaur, ability_index:2, ability_id:"CHLOROPHYLL" },
  { op:"force_evolve", pokemon_index:0, species:"IVYSAUR" },
);
assert.equal(hidden.success, true);
assert.equal(hidden.ability_id, "CHLOROPHYLL");

const nincadaBlocked = resolveEvolutionLabForceEvolutionContextV108(
  { ...bulbasaur, species:"NINCADA" },
  { op:"force_evolve", pokemon_index:0, species:"NINJASK" },
);
assert.equal(nincadaBlocked.success, false);
assert.equal(nincadaBlocked.result, "evolution_after_effect_owner_required");

const missingCanonicalTarget = resolveEvolutionLabForceEvolutionContextV108(
  bulbasaur,
  { op:"force_evolve", pokemon_index:0, species:"ANNIHILAPE" },
);
assert.equal(missingCanonicalTarget.success, false);
assert.equal(missingCanonicalTarget.result, "evolution_target_context_unavailable");

let forceSeed = null;
for (let seed = 0; seed < 10000; seed += 1) {
  const owner = resolveCanonicalEvolutionLabV108({
    event:{ kind:"normal_event", normal_event_id:"evolution_lab", normal_seed:seed },
    choice:"stable",
    party:[bulbasaur],
    selected_index:0,
  });
  if ((owner.operations ?? []).some((operation) => operation?.op === "force_evolve" && operation?.species === "IVYSAUR")) {
    forceSeed = seed;
    break;
  }
}
assert.notEqual(forceSeed, null);

const runtime = {
  player:{ party:[structuredClone(bulbasaur)] },
  bag:{ slots:[], max_slots:20, max_per_slot:99 },
  variables:{ mapless:{
    board_events:[{ kind:"normal_event", normal_event_id:"evolution_lab", normal_seed:forceSeed }],
    board_revealed:[false],
    board_visited:[false],
    board_consumed:[false],
  } },
};
const terminal = resolveSafariEvolutionLabInteraction(runtime, 0, { id:"stable", pokemon_index:0 });
assert.equal(terminal.completed, true);
assert.equal(terminal.terminal, true);
assert.equal(terminal.persistenceRequested, true);
assert.equal(terminal.mutation.result, "pokemon_evolved");
assert.equal(runtime.player.party[0].species, "IVYSAUR");
assert.equal(runtime.player.party[0].ability_id, "OVERGROW");
assert.equal(runtime.player.party[0].ready_to_evolve, false);
assert.equal(runtime.player.party[0].stats.SPECIAL_ATTACK, 10);
assert.equal(runtime.player.party[0].stats.SPEED, 8);
assert.deepEqual(runtime.player.party[0].moves, bulbasaur.moves);
assert.equal(runtime.variables.mapless.board_consumed[0], true);
assert.equal(runtime.variables.mapless.board_events[0].normal_resolved, true);
assert.ok(runtime.variables.mapless.last_operations.some((operation) => operation.op === "request_save"));
assert.ok(runtime.variables.mapless.last_operations.some((operation) => operation.op === "commit_pokemon_mutation" && operation.mutation === "force_evolve"));

console.log("evolution lab force-evolve playable smoke: ok");
