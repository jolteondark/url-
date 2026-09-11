import assert from "node:assert/strict";
import {
  canonicalEvolutionChoicesV108,
  canonicalEvolutionLabCandidatesV108,
} from "../runtime/mapless-species-evolution-v108.js";

assert.deepEqual(canonicalEvolutionChoicesV108({ species:"BULBASAUR", gender:0 }), ["IVYSAUR"]);
assert.deepEqual(canonicalEvolutionChoicesV108({ species:"EEVEE", gender:1 }), [
  "VAPOREON", "JOLTEON", "FLAREON", "LEAFEON", "GLACEON", "SYLVEON", "ESPEON", "UMBREON",
]);
assert.deepEqual(canonicalEvolutionChoicesV108({ species:"KIRLIA", gender:0 }), ["GARDEVOIR", "GALLADE"]);
assert.deepEqual(canonicalEvolutionChoicesV108({ species:"KIRLIA", gender:1 }), ["GARDEVOIR"]);
assert.deepEqual(canonicalEvolutionChoicesV108({ species:"SNORUNT", gender:0 }), ["GLALIE"]);
assert.deepEqual(canonicalEvolutionChoicesV108({ species:"SNORUNT", gender:1 }), ["GLALIE", "FROSLASS"]);
assert.deepEqual(canonicalEvolutionChoicesV108({ species:"BURMY", gender:0 }), ["MOTHIM"]);
assert.deepEqual(canonicalEvolutionChoicesV108({ species:"BURMY", gender:1 }), ["WORMADAM"]);
assert.deepEqual(canonicalEvolutionChoicesV108({ species:"VENUSAUR", gender:0 }), []);
assert.deepEqual(canonicalEvolutionChoicesV108({ species:"BULBASAUR", gender:0, steps_to_hatch:10 }), []);

const party = [
  { species:"VENUSAUR", gender:0 },
  { species:"KIRLIA", gender:1 },
  { species:"BULBASAUR", gender:0 },
];
assert.deepEqual(
  canonicalEvolutionLabCandidatesV108(party).map((entry) => [entry.index, entry.evolutions]),
  [[1, ["GARDEVOIR"]], [2, ["IVYSAUR"]]],
);

console.log("evolution choice v0.9.108 smoke: ok");
