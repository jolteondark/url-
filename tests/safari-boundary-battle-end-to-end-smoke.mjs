import "./safari-boundary-player-replacement-smoke.mjs";
import "./safari-boundary-player-ko-return-vertical-smoke.mjs";
import assert from "node:assert/strict";
import { createSafariPlayableRuntime, resolveSafariBattleRound, returnSafariToDayBoard } from "../runtime/safari-playable-integration.js";
import { startSafariBoundaryTrialBattle } from "../runtime/safari-boundary-trial-start.js";

const runtime = createSafariPlayableRuntime();
const state = runtime.variables.mapless;
state.day = 10;
state.location = "boundary_trial";
state.boundary_trial = {
  day: 10,
  leader_bag: ["MISTY","SURGE","ERIKA","KOGA","SABRINA","BLAINE","GREEN"],
  last_leader: null,
  pending_leader: "BROCK",
  trial_count: 0,
  trial_started: false,
  trial_cleared: false,
  trial_floor: 10,
  result: "preparation_required",
};
startSafariBoundaryTrialBattle(runtime);
assert.equal(state.battle.trainer_party_index, 0);

for (let expectedIndex = 0; expectedIndex < 3; expectedIndex += 1) {
  const activeIndex = state.battle.trainer_party_index;
  assert.equal(activeIndex, expectedIndex);
  state.battle.foe.hp = 1;
  state.battle.trainer_party[activeIndex].hp = 1;
  runtime.player.party[0].hp = runtime.player.party[0].max_hp;
  const result = resolveSafariBattleRound(runtime, "TACKLE");
  if (expectedIndex < 2) {
    assert.equal(result.decision, 0);
    assert.equal(result.replacementApplied, true);
    assert.equal(result.foeReplacementApplied, true);
    assert.equal(state.battle.trainer_party_index, expectedIndex + 1);
    assert.equal(state.battle.completed, false);
    assert.equal(state.battle.phase, "COMMAND");
    assert.equal(state.battle.replacement_checkpoint?.committed, true,
      "boundary trainer reserve mutation must commit through the central REPLACEMENT checkpoint");
    assert.deepEqual(
      state.battle.phase_trace.slice(-3).map((entry) => entry.phase),
      ["POST_FAINT", "REPLACEMENT", "COMMAND"],
      "boundary reserve must switch at REPLACEMENT and return to COMMAND without a same-round reserve action",
    );
    assert.equal(result.operations.filter((operation) => operation.op === "send_out").length, 1,
      "canonical replacement/switch owner must emit exactly one reserve send_out");
    const faintIndex = result.operations.findIndex((operation) => operation.op === "faint" && operation.target === "foe");
    assert.ok(faintIndex >= 0, "boundary reserve KO must contain the defeated active faint operation");
    assert.equal(result.operations.slice(faintIndex + 1).some((operation) => operation.op === "use_move" && operation.actor === "foe"), false,
      "the newly sent-out boundary reserve must get zero attacks in the KO round");
  } else {
    assert.equal(result.decision, 1);
    assert.equal(state.battle.completed, true);
    assert.equal(state.battle.phase, "RESULT");
    assert.equal(state.battle.completed_phase, "RESULT");
    assert.equal(state.battle.phase_trace.at(-1)?.phase, "RESULT");
    assert.equal(state.battle.phase_trace.some((entry) => entry.phase === "POST_VICTORY"), true);
    assert.equal(state.battle.phase_trace.some((entry) => entry.phase === "REWARD_GROWTH"), true);
    assert.equal(state.boundary_trial.result, "victory_returned_to_board");
    assert.equal(state.boundary_trial.trial_count, 1);
    assert.equal(state.boundary_trial.last_leader, "BROCK");
  }
}

const returned = returnSafariToDayBoard(runtime);
assert.equal(returned.target, "day_board");
assert.equal(returned.phase, "RETURN");
assert.equal(returned.persistenceRequested, true);
assert.equal(returned.operations.filter((operation) => operation?.op === "request_save").length, 1,
  "boundary RETURN must request persistence exactly once through the central owner");
assert.equal(returned.phaseTrace.at(-1)?.phase, "RETURN");
assert.equal(state.day, 11);
assert.equal(state.location, "day_board");
assert.equal(state.board_events.length, 8);
assert.equal(state.battle, null);
assert.equal(state.boundary_trial.trial_cleared, false);
assert.equal(state.boundary_trial.trial_floor, null);
assert.equal(state.boundary_trial.trial_count, 1);
assert.equal(state.boundary_trial.last_leader, "BROCK");
assert.equal(state.boundary_trial.result, "returned_to_board");
assert.equal(state.boundary_trial.battle_request, null);
console.log("Safari boundary battle end-to-end smoke: ok");
