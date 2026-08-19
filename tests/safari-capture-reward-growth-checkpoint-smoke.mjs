import assert from "node:assert/strict";
import {
  attemptSafariCapture as attemptSafariNormalCapture,
  commitSafariCapturedWildRewardGrowth,
} from "../runtime/safari-normal-battle-lifecycle.js";
import {
  SAFARI_BATTLE_PHASE,
  beginSafariBattleCommand,
  commitSafariBattleResolution,
} from "../runtime/safari-battle-orchestrator.js";

// Use the real lightweight public Battle entry only to materialize a normal wild Battle.
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };
const web = await import("../runtime/safari-web-playable-integration.js");

const runtime = web.createSafariPlayableRuntime();
const state = runtime.variables.mapless;
state.board_events[0] = { kind: "wild", type: "BUG", slot: 0 };
state.board_revealed[0] = true;
state.board_consumed[0] = false;
state.board_visited[0] = false;
state.location = "day_board";
state.battle = null;

const started = await web.activateSafariDayBoardCell(runtime, 0);
assert.equal(started.result, "dispatched");
assert.ok(state.battle && state.battle.kind === "wild" && !state.battle.completed);

beginSafariBattleCommand(runtime, "capture");
const rawCapture = attemptSafariNormalCapture(runtime, {
  captureRandomSeed: 1,
  randomValues: [0, 0, 0, 0],
});
assert.equal(rawCapture.result, "caught");
assert.equal(state.battle.decision, 4);
assert.equal(state.battle.completed, false,
  "lower capture owner must not publish terminal completion before RESULT");
assert.equal(state.board_consumed[0], false,
  "successful capture must not consume the Board cell before central REWARD_GROWTH");
assert.equal(state.battle.capture_reward_growth_committed, undefined);

let rewardGrowthCalls = 0;
const committed = commitSafariBattleResolution(runtime, rawCapture, "capture", {
  rewardGrowthCommit(current) {
    rewardGrowthCalls += 1;
    assert.equal(state.battle.phase, SAFARI_BATTLE_PHASE.REWARD_GROWTH,
      "deferred Board finalization must execute while the central owner is at REWARD_GROWTH");
    assert.equal(state.battle.completed, false,
      "RESULT remains the only externally visible completion boundary");
    return commitSafariCapturedWildRewardGrowth(runtime, current);
  },
});

assert.equal(rewardGrowthCalls, 1);
assert.equal(state.board_consumed[0], true,
  "REWARD_GROWTH must commit the existing Day Board completion owner exactly once");
assert.equal(state.battle.capture_reward_growth_committed, true);
assert.equal(state.battle.phase, SAFARI_BATTLE_PHASE.RESULT);
assert.equal(state.battle.completed, true);
assert.equal(state.battle.completed_phase, SAFARI_BATTLE_PHASE.RESULT);
assert.equal(committed.persistenceRequested, true,
  "capture terminal persistence must be visible only after the deferred Board commit");
assert.deepEqual(
  state.battle.phase_trace.slice(-4).map((step) => step.phase),
  ["POST_FAINT", "POST_VICTORY", "REWARD_GROWTH", "RESULT"],
);

const operationCount = state.battle.last_operations.length;
commitSafariBattleResolution(runtime, committed, "capture", {
  rewardGrowthCommit() {
    rewardGrowthCalls += 1;
    throw new Error("already-committed RESULT must not replay capture reward growth");
  },
});
assert.equal(rewardGrowthCalls, 1,
  "compatibility replay of a terminal capture must not replay REWARD_GROWTH mutations");
assert.equal(state.battle.last_operations.length, operationCount,
  "replayed RESULT must not duplicate Board/save operations");
assert.equal(state.battle.phase_trace.filter((step) => step.phase === SAFARI_BATTLE_PHASE.REWARD_GROWTH).length, 1);
assert.equal(state.battle.phase_trace.filter((step) => step.phase === SAFARI_BATTLE_PHASE.RESULT).length, 1);

console.log("Safari capture REWARD_GROWTH checkpoint smoke: PASS");
