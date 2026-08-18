import assert from "node:assert/strict";
import { resolvePriorityCanonical } from "../runtime/battle-core-priority.js";
import {
  BATTLE_SPEED_CANONICAL_PROVENANCE,
  resolveBattleSpeedCanonical,
  resolveOrdinaryPokemonSpeedCanonical,
} from "../runtime/battle-core-speed.js";

assert.equal(BATTLE_SPEED_CANONICAL_PROVENANCE.sourceBodySha256, "e2d093937295bd7422548e7fa7cd36cff05d41a66a0e329c00ca8bf93b0b28c3");
assert.equal(resolveBattleSpeedCanonical({ baseSpeed: 100 }), 100);
assert.equal(resolveBattleSpeedCanonical({ baseSpeed: 100, speedStage: 1 }), 150);
assert.equal(resolveBattleSpeedCanonical({ baseSpeed: 100, status: "PARALYSIS", mechanicsGeneration: 9 }), 50);
assert.equal(resolveBattleSpeedCanonical({ baseSpeed: 100, status: "PARALYSIS", mechanicsGeneration: 6 }), 25);
assert.equal(resolveBattleSpeedCanonical({ baseSpeed: 100, status: "PARALYSIS", quickFeetActive: true }), 100);
assert.equal(resolveBattleSpeedCanonical({ baseSpeed: 100, fainted: true }), 1);

const ordinary = (speed, status = "NONE", ability_id = null) => ({
  status,
  ability_id,
  stats: { SPEED: speed },
});
assert.equal(resolveOrdinaryPokemonSpeedCanonical(ordinary(100, "PARALYSIS")), 50);
assert.equal(resolveOrdinaryPokemonSpeedCanonical(ordinary(100, "PARALYSIS", "QUICKFEET")), 100);

const playerSpeed = resolveOrdinaryPokemonSpeedCanonical(ordinary(100, "PARALYSIS"));
const foeSpeed = resolveOrdinaryPokemonSpeedCanonical(ordinary(60));
const priority = resolvePriorityCanonical({
  entries: [
    { actionIndex: 0, battlerIndex: 0, speed: playerSpeed, movePriority: 0 },
    { actionIndex: 1, battlerIndex: 1, speed: foeSpeed, movePriority: 0 },
  ],
  randomOrder: [0, 1],
});
assert.deepEqual(priority.order, [1, 0], "ordinary PARALYSIS must halve calculated Speed before action ordering");

console.log("ordinary paralysis speed owner smoke: ok");
