import assert from "node:assert/strict";
import { resolveCanonicalEvolutionLabV108 } from "../runtime/mapless-evolution-lab-v108.js";

const event = { kind:"normal_event", normal_event_id:"evolution_lab", normal_seed:12345 };
const party = [
  { species:"BULBASAUR", level:12, personal_id:101, gender:0 },
  { species:"VENUSAUR", level:40, personal_id:102, gender:1 },
  { species:"KIRLIA", level:24, personal_id:103, gender:0 },
  { species:"EEVEE", level:18, personal_id:104, gender:1, egg:true },
];

const pending = resolveCanonicalEvolutionLabV108({ event, choice:"stable", party });
assert.equal(pending.completed, false);
assert.equal(pending.outcome, "pokemon_selection_required");
const eligible = pending.operations.find((operation) => operation.op === "eligible_pokemon");
assert.deepEqual(eligible.entries.map((entry) => entry.index), [0, 2]);
assert.deepEqual(eligible.entries[0].evolutions, ["IVYSAUR"]);
assert.deepEqual(eligible.entries[1].evolutions, ["GARDEVOIR", "GALLADE"]);
assert.equal(eligible.entries[0].id, 101);
assert.equal(eligible.entries[0].name, "BULBASAUR");

const selected = resolveCanonicalEvolutionLabV108({ event, choice:"stable", party, selected_index:0 });
assert.ok(selected.operations.some((operation) => operation.op === "selected_evolution" && operation.species === "IVYSAUR"));
assert.ok(selected.operations.some((operation) => operation.op === "evolution_lab_roll"));

const explicitStillWorks = resolveCanonicalEvolutionLabV108({
  event,
  choice:"stable",
  eligible_pokemon:[{ index:7, id:"legacy", name:"Explicit", evolutions:["IVYSAUR"] }],
});
assert.equal(explicitStillWorks.outcome, "pokemon_selection_required");
assert.deepEqual(explicitStillWorks.operations.find((operation) => operation.op === "eligible_pokemon").entries.map((entry) => entry.index), [7]);

console.log("evolution lab party owner smoke: ok");
