import assert from "node:assert/strict";
import { createSafariPlayableRuntime } from "../runtime/safari-playable-integration-core.js";
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

const result = startSafariBoundaryTrialBattle(runtime);
assert.equal(result.result, "battle_started");
assert.equal(result.persistenceRequested, true);
assert.equal(state.boundary_trial.result, "battle_requested");
assert.equal(state.boundary_trial.trial_started, true);
assert.equal(state.battle.origin, "boundary_trial");
assert.equal(state.battle.kind, "trainer");
assert.equal(state.battle.trainer.trainer_full_name, "ジムリーダーのタケシ");
assert.equal(state.battle.skill_level, 64);
assert.equal(state.battle.trainer_party.length, 3);
assert.deepEqual(state.battle.trainer_party.map((pokemon) => pokemon.species), ["GEODUDE","RHYHORN","ONIX"]);
assert.deepEqual(state.battle.trainer_party.map((pokemon) => pokemon.level), [5,5,7]);
assert.equal(state.battle.foe.species, "GEODUDE");
assert.match(state.notice, /タケシ.*勝負を仕掛けてきた/);
console.log("Safari boundary battle start smoke: ok");
