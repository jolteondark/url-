import assert from "node:assert/strict";
import { applyBrowserBattleTurnEndStatStagesCanonical } from "../runtime/browser-battle-round-runtime.js";

const turnEnd = (...statChanges) => ({
  boundary: "turn_end",
  hpBefore: 100,
  hpAfter: 100,
  hpDelta: 0,
  reason: "speed_boost",
  statusChanged: false,
  statusRequest: null,
  statChanges,
});

{
  const resolved = applyBrowserBattleTurnEndStatStagesCanonical({
    statStages: {
      0: { SPEED: 0 },
      1: { SPEED: 0 },
    },
    playerTurnEndIntegration: turnEnd({ subject: "user", stat: "SPEED", delta: 1 }),
    foeTurnEndIntegration: turnEnd({ subject: "user", stat: "SPEED", delta: 1 }),
  });
  assert.equal(resolved.state[0].SPEED, 1, "player Speed Boost must persist into next-round Battle stages");
  assert.equal(resolved.state[1].SPEED, 1, "foe Speed Boost must persist into next-round Battle stages");
  assert.equal(resolved.applied.length, 2);
  assert.equal(resolved.applied[0].battlerIndex, 0);
  assert.equal(resolved.applied[1].battlerIndex, 1);
}

{
  const resolved = applyBrowserBattleTurnEndStatStagesCanonical({
    statStages: {
      0: { SPEED: 6, ATTACK: 2 },
      1: { SPEED: -2, DEFENSE: 3 },
    },
    playerTurnEndIntegration: turnEnd({ subject: "user", stat: "SPEED", delta: 1 }),
  });
  assert.equal(resolved.state[0].SPEED, 6, "turn-end stat changes must use the canonical +6 cap");
  assert.equal(resolved.state[0].ATTACK, 2, "unrelated player stages must be preserved");
  assert.equal(resolved.state[1].SPEED, -2, "foe stages must stay independent when only player triggers");
  assert.equal(resolved.state[1].DEFENSE, 3);
  assert.equal(resolved.applied[0].appliedDelta, 0);
}

{
  const resolved = applyBrowserBattleTurnEndStatStagesCanonical({
    statStages: { 0: { SPEED: 2 }, 1: { SPEED: 3 } },
    playerTurnEndIntegration: null,
    foeTurnEndIntegration: null,
  });
  assert.equal(resolved.state[0].SPEED, 2, "decided battles expose no turn-end commit and must not change stages");
  assert.equal(resolved.state[1].SPEED, 3);
  assert.deepEqual(resolved.applied, []);
}

console.log("browser Battle turn-end stat-stage live smoke: PASS");
