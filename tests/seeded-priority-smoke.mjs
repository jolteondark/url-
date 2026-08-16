import assert from "node:assert/strict";
import {
  PRIORITY_CANONICAL_PROVENANCE,
  buildCanonicalPriorityRandomOrder,
  resolvePriorityCanonical,
} from "../runtime/battle-core-priority.js";
import { resolveAttackPhaseCanonical } from "../runtime/battle-core-attack-phase.js";

assert.equal(PRIORITY_CANONICAL_PROVENANCE.calculatePriorityBodySha256, "aa6b926ce5e268005cb47b94df5f9caab09ef04a700268814e717dc2b0103248");
assert.deepEqual(buildCanonicalPriorityRandomOrder(3, 1), [1, 0, 2, 3]);

const entries = [0, 1, 2, 3].map((actionIndex) => ({
  actionIndex,
  battlerIndex: actionIndex,
  speed: 100,
  movePriority: 0,
}));
const seeded = resolvePriorityCanonical({ entries, randomSeed: 1 });
assert.deepEqual(seeded.order, [3, 2, 0, 1]);
assert.deepEqual(seeded.operations[0].randomOrder, [1, 0, 2, 3]);

const commandEntries = [0, 1, 2, 3].map((battlerIndex) => ({
  battlerIndex,
  ownedByPlayer: battlerIndex % 2 === 0,
  selectedMoveIndex: 0,
  selectedMoveId: `MOVE_${battlerIndex}`,
  selectedMoveExists: true,
  selectedMoveCanChoose: true,
}));
const actions = [0, 1, 2, 3].map((battlerIndex) => ({
  kind: "move",
  battlerIndex,
  moveIndex: 0,
  moveId: `MOVE_${battlerIndex}`,
}));
const phase = resolveAttackPhaseCanonical({
  commandEntries,
  actions,
  priorityEntries: entries,
  priorityRandomSeed: 1,
});
const initial = phase.operations.find((entry) => entry.op === "calculate_priority" && entry.scope === "attack_phase_start");
assert.deepEqual(initial.randomOrder, [1, 0, 2, 3]);
assert.deepEqual(initial.order, [3, 2, 0, 1]);
assert.deepEqual(phase.processOrder, [3, 2, 0, 1]);
for (const loop of phase.moves.operations.filter((entry) => entry.op === "calculate_priority")) {
  const remaining = initial.order.filter((index) => loop.order.includes(index));
  assert.deepEqual(loop.order, remaining);
}

console.log(JSON.stringify({ ok: true, randomOrder: initial.randomOrder, processOrder: phase.processOrder }));
