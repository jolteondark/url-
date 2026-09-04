import assert from "node:assert/strict";
import { filterMaplessV108EvolutionChoices } from "../runtime/mapless-v108-evolution-choice-filter.js";

const kirlia = [["GARDEVOIR", "Level"], ["GALLADE", "ItemMale"]];
assert.deepEqual(filterMaplessV108EvolutionChoices(kirlia, { gender: "male" }), ["GARDEVOIR", "GALLADE"]);
assert.deepEqual(filterMaplessV108EvolutionChoices(kirlia, { gender: "female" }), ["GARDEVOIR"]);

const snorunt = [["GLALIE", "Level"], ["FROSLASS", "ItemFemale"]];
assert.deepEqual(filterMaplessV108EvolutionChoices(snorunt, { gender: "female" }), ["GLALIE", "FROSLASS"]);
assert.deepEqual(filterMaplessV108EvolutionChoices(snorunt, { gender: "male" }), ["GLALIE"]);

const burmy = [["WORMADAM", "LevelFemale"], ["MOTHIM", "LevelMale"]];
assert.deepEqual(filterMaplessV108EvolutionChoices(burmy, { gender: "female" }), ["WORMADAM"]);
assert.deepEqual(filterMaplessV108EvolutionChoices(burmy, { gender: "male" }), ["MOTHIM"]);

// Canonical v0.9.108 data declares these as generic Level, so the helper must
// not "correct" them with main-series gender restrictions.
assert.deepEqual(filterMaplessV108EvolutionChoices([["VESPIQUEN", "Level"]], { gender: "male" }), ["VESPIQUEN"]);
assert.deepEqual(filterMaplessV108EvolutionChoices([["SALAZZLE", "Level"]], { gender: "male" }), ["SALAZZLE"]);

const eevee = [["VAPOREON", "Item"], ["JOLTEON", "Item"], ["FLAREON", "Item"], ["ESPEON", "Item"]];
assert.deepEqual(filterMaplessV108EvolutionChoices(eevee, { gender: "female" }), ["VAPOREON", "JOLTEON", "FLAREON", "ESPEON"]);

assert.deepEqual(filterMaplessV108EvolutionChoices([["RATICATE", "Level"], ["RATICATE", "Level"]]), ["RATICATE"]);
assert.deepEqual(filterMaplessV108EvolutionChoices([["MISSING", "Level"]], { speciesExists: () => false }), []);
assert.deepEqual(filterMaplessV108EvolutionChoices(null), []);

console.log("mapless v0.9.108 evolution choice filter smoke: ok");
