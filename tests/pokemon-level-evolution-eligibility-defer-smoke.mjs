import assert from "node:assert/strict";
import fs from "node:fs";
import { resolvePokemonLevelEvolution } from "../runtime/pokemon-level-evolution-runtime.js";

const itemOnlyMasters = {
  ITEMONLY: { id: "ITEMONLY", evolutions: [{ species: "ITEMTARGET", method: "Item", parameter: "MOONSTONE" }] },
};

{
  const resolved = resolvePokemonLevelEvolution(
    { species: "ITEMONLY", level: 30, held_item: "EVERSTONE", ability: "NONE" },
    { species_masters: itemOnlyMasters },
  );
  assert.equal(resolved.evolved, false);
  assert.equal(resolved.levelEvolutionCandidate, null);
  assert.equal(resolved.evolutionBlockedBy, null);
  assert.deepEqual(resolved.operations, []);
  assert.deepEqual(resolved.unsupportedMethods, ["Item"]);
}

const eligibleMasters = {
  LEVELSOURCE: {
    id: "LEVELSOURCE",
    evolutions: [
      { species: "LEVELTARGET", method: "Level", parameter: 12 },
      { species: "ITEMTARGET", method: "Item", parameter: "MOONSTONE" },
    ],
  },
};

{
  const resolved = resolvePokemonLevelEvolution(
    { species: "LEVELSOURCE", level: 12, held_item: "EVERSTONE", ability: "NONE" },
    { species_masters: eligibleMasters },
  );
  assert.equal(resolved.evolved, false);
  assert.deepEqual(resolved.levelEvolutionCandidate, { to: "LEVELTARGET", method: "Level", parameter: 12 });
  assert.equal(resolved.evolutionBlockedBy, "EVERSTONE");
  assert.ok(resolved.operations.some((operation) => operation.op === "level_evolution_blocked" && operation.blocker === "EVERSTONE"));
  assert.deepEqual(resolved.unsupportedMethods, ["Item"]);
}

const integrationSource = fs.readFileSync(new URL("../runtime/battle-exp-runtime-integration.js", import.meta.url), "utf8");
assert.match(integrationSource, /const hasEligibleLevelEvolution = Boolean\(evolution\?\.levelEvolutionCandidate\)/);
assert.match(integrationSource, /deferEvolution === true && hasEligibleLevelEvolution/);
assert.match(integrationSource, /pendingEvolution: evolutionDeferred \? structuredClone\(evolution\?\.levelEvolutionCandidate \?\? null\) : null/);

console.log("Pokemon Level evolution eligibility-only defer smoke: PASS");
