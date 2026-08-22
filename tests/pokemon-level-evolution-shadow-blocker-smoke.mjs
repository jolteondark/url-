import assert from "node:assert/strict";
import { resolvePokemonLevelEvolution } from "../runtime/pokemon-level-evolution-runtime.js";

const source = {
  id: "SHADOWSOURCE",
  evolutions: [
    { species: "SHADOWTARGET", method: "Level", parameter: 12 },
    { species: "UNSUPPORTEDTARGET", method: "Item", parameter: "MOONSTONE" },
  ],
};
const target = { id: "SHADOWTARGET", evolutions: [] };
const speciesMasters = { SHADOWSOURCE: source, SHADOWTARGET: target };

for (const heartGauge of [500, 0]) {
  const pokemon = {
    species: "SHADOWSOURCE",
    level: 12,
    personal_id: 123456,
    shadow: true,
    heart_gauge: heartGauge,
    held_item: "ORANBERRY",
    ability: "OVERGROW",
    moves: [{ id: "TACKLE", pp: 17, ppup: 0 }],
  };
  const before = structuredClone(pokemon);
  const result = resolvePokemonLevelEvolution(pokemon, { species_masters: speciesMasters });

  assert.equal(result.evolved, false, "Shadow Pokemon must not evolve even when a Level candidate is eligible");
  assert.equal(result.evolution, null);
  assert.deepEqual(result.levelEvolutionCandidate, { to: "SHADOWTARGET", method: "Level", parameter: 12 });
  assert.equal(result.evolutionBlockedBy, "SHADOW");
  assert.deepEqual(result.unsupportedMethods, ["Item"]);
  assert.deepEqual(result.operations, [{ op: "level_evolution_blocked", blocker: "SHADOW" }]);
  assert.deepEqual(result.pokemon, before, "blocking evolution must preserve identity/state exactly");
}

console.log("Pokemon Level evolution canonical Shadow blocker: PASS");
