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
    assert.equal(state.battle.trainer_party_index, expectedIndex + 1);
    assert.equal(state.battle.completed, false);
  } else {
    assert.equal(result.decision, 1);
    assert.equal(state.battle.completed, true);
    assert.equal(state.boundary_trial.result, "victory_returned_to_board");
    assert.equal(state.boundary_trial.trial_count, 1);
    assert.equal(state.boundary_trial.last_leader, "BROCK");
  }
}

const returned = returnSafariToDayBoard(runtime);
assert.equal(returned.target, "day_board");
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
