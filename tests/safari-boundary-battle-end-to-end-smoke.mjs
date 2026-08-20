import "./safari-boundary-player-replacement-smoke.mjs";
import "./safari-boundary-player-ko-return-vertical-smoke.mjs";
import "./safari-day13-shop-day14-continued-run-smoke.mjs";
import "./safari-flooded-river-interaction-smoke.mjs";
import "./safari-day14-river-day15-continued-run-smoke.mjs";
import "./safari-day15-wild-day16-shop-day17-continued-run-smoke.mjs";
import "./safari-day17-buried-item-day18-continued-run-smoke.mjs";
import "./safari-day18-egg-shop-day19-continued-run-smoke.mjs";
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
  const battle = state.battle;
  assert.equal(battle.trainer_party_index, expectedIndex);
  battle.foe.hp = 1;
  battle.foe.fainted = false;
  battle.trainer_party[expectedIndex].hp = 1;
  battle.trainer_party[expectedIndex].fainted = false;
  runtime.player.party[0].hp = runtime.player.party[0].max_hp;
  runtime.player.party[0].stats.ATTACK = 9999;
  runtime.player.party[0].stats.SPEED = 9999;
  resolveSafariBattleRound(runtime, "TACKLE");
  if (expectedIndex < 2) {
    assert.equal(state.battle.completed, false);
    assert.equal(state.battle.trainer_party_index, expectedIndex + 1);
    assert.equal(state.battle.foe.species, state.battle.trainer_party[expectedIndex + 1].species);
  }
}

assert.equal(state.battle.completed, true);
assert.equal(state.battle.decision, 1);
assert.equal(state.location, "boundary_trial");
assert.equal(state.boundary_trial.trial_cleared, true);
assert.equal(state.boundary_trial.last_leader, "BROCK");
assert.equal(state.boundary_trial.pending_leader, null);

const returned = returnSafariToDayBoard(runtime);
assert.equal(returned.target, "day_board");
assert.equal(state.day, 11);
assert.equal(state.location, "day_board");
assert.equal(state.battle, null);
assert.equal(state.boundary_trial.trial_cleared, false);
assert.equal(state.board_events.length, 8);

console.log("Safari boundary trainer party -> replacements -> victory -> DAY11 Board: PASS");
