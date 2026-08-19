import assert from "node:assert/strict";
import fs from "node:fs";
import { resolvePokemonLevelEvolution } from "../runtime/pokemon-level-evolution-runtime.js";

const noLevelMasters = {
  ITEMONLY: {
    id: "ITEMONLY",
    evolutions: [{ species: "ITEMTARGET", method: "Item", parameter: "MOONSTONE" }],
  },
};

{
  const pokemon = { species: "ITEMONLY", level: 30, held_item: "EVERSTONE", ability: "NONE" };
  const resolved = resolvePokemonLevelEvolution(pokemon, { species_masters: noLevelMasters });
  assert.equal(resolved.evolved, false);
  assert.equal(resolved.levelEvolutionCandidate, null,
    "species with no eligible Level evolution must not publish a deferred Level candidate");
  assert.equal(resolved.evolutionBlockedBy, null,
    "Everstone must not report a blocked Level evolution when no Level evolution is eligible");
  assert.deepEqual(resolved.operations, [],
    "no eligible Level evolution must not emit a false level_evolution_blocked operation");
  assert.deepEqual(resolved.unsupportedMethods, ["Item"],
    "unsupported non-Level methods remain explicit even when no Level candidate exists");
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
  const pokemon = { species: "LEVELSOURCE", level: 12, held_item: "EVERSTONE", ability: "NONE" };
  const resolved = resolvePokemonLevelEvolution(pokemon, { species_masters: eligibleMasters });
  assert.equal(resolved.evolved, false);
  assert.deepEqual(resolved.levelEvolutionCandidate, { to: "LEVELTARGET", method: "Level", parameter: 12 },
    "eligible Level target must remain explicit even when the final post-battle check is currently blocked");
  assert.equal(resolved.evolutionBlockedBy, "EVERSTONE");
  assert.ok(resolved.operations.some((operation) => operation.op === "level_evolution_blocked" && operation.blocker === "EVERSTONE"));
  assert.deepEqual(resolved.unsupportedMethods, ["Item"]);
}

const integrationSource = fs.readFileSync(new URL("../runtime/battle-exp-runtime-integration.js", import.meta.url), "utf8");
assert.match(integrationSource, /const hasEligibleLevelEvolution = Boolean\(evolution\?\.levelEvolutionCandidate\)/,
  "Battle EXP reflection must decide deferred Level evolution from explicit eligibility, not merely from level gain");
assert.match(integrationSource, /deferEvolution === true && hasEligibleLevelEvolution/,
  "deferred marker must only be created for an eligible Level target");
assert.match(integrationSource, /pendingEvolution: evolutionDeferred \? structuredClone\(evolution\?\.levelEvolutionCandidate \?\? null\) : null/,
  "pending evolution reporting must use the blocker-independent eligible Level candidate");

console.log("Pokemon Level evolution eligibility-only defer smoke: PASS");
