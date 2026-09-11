import assert from "node:assert/strict";
import { resolveCanonicalEvolutionLabV108 } from "../runtime/mapless-evolution-lab-v108.js";
import {
  resolveSafariEvolutionLabInteraction,
  safariEvolutionLabPresentation,
} from "../runtime/safari-evolution-lab-interaction.js";

const party = [
  { species:"BULBASAUR", level:12, personal_id:101, gender:0 },
  { species:"VENUSAUR", level:40, personal_id:102, gender:1 },
  { species:"KIRLIA", level:24, personal_id:103, gender:0 },
];

function runtimeFor(seed) {
  return {
    player:{ party:structuredClone(party) },
    bag:{ slots:[], max_slots:20, max_per_slot:99 },
    variables:{ mapless:{
      board_events:[{ kind:"normal_event", normal_event_id:"evolution_lab", normal_seed:seed }],
      board_revealed:[false],
      board_visited:[false],
      board_consumed:[false],
    } },
  };
}

let noChangeSeed = null;
for (let seed = 0; seed < 10000; seed += 1) {
  const owner = resolveCanonicalEvolutionLabV108({
    event:{ kind:"normal_event", normal_event_id:"evolution_lab", normal_seed:seed },
    choice:"stable",
    party,
    selected_index:0,
  });
  if (owner.outcome === "stable_no_change") { noChangeSeed = seed; break; }
}
assert.notEqual(noChangeSeed, null);

const runtime = runtimeFor(noChangeSeed);
const presentation = safariEvolutionLabPresentation(runtime, 0);
assert.equal(presentation.actions.find((entry) => entry.id === "stable")?.disabled, false);
assert.equal(presentation.actions.find((entry) => entry.id === "maximum")?.disabled, true);
assert.deepEqual(presentation.eligiblePokemon.map((entry) => entry.index), [0, 2]);

const choosePokemon = resolveSafariEvolutionLabInteraction(runtime, 0, "stable");
assert.equal(choosePokemon.result, "pokemon_selection_required");
assert.equal(choosePokemon.completed, false);
assert.equal(choosePokemon.selection.kind, "pokemon");
assert.deepEqual(choosePokemon.selection.entries.map((entry) => entry.index), [0, 2]);
assert.equal(runtime.variables.mapless.board_consumed[0], false);

const chooseEvolution = resolveSafariEvolutionLabInteraction(runtime, 0, { id:"stable", pokemon_index:2 });
assert.equal(chooseEvolution.result, "evolution_selection_required");
assert.equal(chooseEvolution.completed, false);
assert.equal(chooseEvolution.selection.kind, "evolution");
assert.deepEqual(chooseEvolution.selection.entries.map((entry) => entry.species), ["GARDEVOIR", "GALLADE"]);
assert.equal(runtime.variables.mapless.board_consumed[0], false);

const terminal = resolveSafariEvolutionLabInteraction(runtime, 0, { id:"stable", pokemon_index:0 });
assert.equal(terminal.result, "stable_no_change");
assert.equal(terminal.completed, true);
assert.equal(terminal.persistenceRequested, true);
assert.equal(runtime.variables.mapless.board_consumed[0], true);
assert.equal(runtime.variables.mapless.board_events[0].normal_resolved, true);
assert.ok(runtime.variables.mapless.last_operations.some((operation) => operation.op === "request_save"));

console.log("evolution lab safari selection smoke: ok");
