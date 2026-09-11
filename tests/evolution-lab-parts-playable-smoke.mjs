import assert from "node:assert/strict";
import { resolveSafariEvolutionLabInteraction } from "../runtime/safari-evolution-lab-interaction.js";

function runtimeFor(event, slots = []) {
  return {
    player:{ party:[{ species:"EEVEE", hp:10, egg:false }] },
    variables:{ mapless:{
      day:1,
      board_events:[event],
      board_revealed:[false],
      board_visited:[false],
      board_consumed:[false],
      battle:null,
      shop:null,
      last_operations:[],
      preview_encounter_seed:123456,
      preview_encounter_counter:0,
    } },
    bag:{ slots:structuredClone(slots), money:0, max_slots:20, max_per_slot:99 },
  };
}

const event = {
  kind:"normal_event",
  normal_event_id:"evolution_lab",
  normal_seed:98765,
  normal_resolved:false,
  normal_data:{},
};

{
  const runtime = runtimeFor(structuredClone(event));
  const result = resolveSafariEvolutionLabInteraction(runtime, 0, "leave");
  assert.equal(result.completed, true);
  assert.equal(result.terminal, true);
  assert.equal(runtime.variables.mapless.board_consumed[0], true);
  assert.ok(result.operations.some((operation) => operation.op === "leave_event"));
  assert.ok(result.operations.some((operation) => operation.op === "request_save"));
  assert.equal(result.persistenceRequested, true);
}

{
  const runtime = runtimeFor(structuredClone(event));
  const result = resolveSafariEvolutionLabInteraction(runtime, 0, "parts");
  assert.equal(result.completed, true);
  assert.equal(result.terminal, true);
  assert.equal(runtime.variables.mapless.board_consumed[0], true);
  assert.equal(runtime.bag.slots.length, 1);
  assert.equal(runtime.bag.slots[0][1], 1);
  assert.ok(result.rewardItem);
  assert.ok(result.operations.some((operation) => operation.op === "runtime_grant_item"));
  assert.ok(result.operations.some((operation) => operation.op === "request_save"));
  assert.equal(result.persistenceRequested, true);
}

{
  const full = Array.from({ length:20 }, (_, index) => [`FILLER_${index}`, 99]);
  const runtime = runtimeFor(structuredClone(event), full);
  const result = resolveSafariEvolutionLabInteraction(runtime, 0, "parts");
  assert.equal(result.completed, false);
  assert.equal(runtime.variables.mapless.board_consumed[0], false);
  assert.equal(runtime.variables.mapless.preview_encounter_counter, 0);
  assert.equal(result.persistenceRequested, false);
}

{
  const runtime = runtimeFor(structuredClone(event));
  const stable = resolveSafariEvolutionLabInteraction(runtime, 0, "stable");
  assert.equal(stable.result, "pokemon_mutation_owner_unavailable");
  assert.equal(stable.completed, false);
  assert.equal(runtime.variables.mapless.board_consumed[0], false);
}

console.log("evolution lab parts playable smoke: ok");
