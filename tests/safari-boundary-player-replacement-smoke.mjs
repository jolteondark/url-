import assert from "node:assert/strict";
import { createSafariPlayableRuntime, resolveSafariBoundaryPlayerReplacement } from "../runtime/safari-playable-integration.js";
import { startSafariBoundaryTrialBattle } from "../runtime/safari-boundary-trial-start.js";

const runtime = createSafariPlayableRuntime();
const state = runtime.variables.mapless;
state.day = 10;
state.location = "boundary_trial";
state.boundary_trial = {
  day: 10,
  leader_bag: ["MISTY", "SURGE", "ERIKA", "KOGA", "SABRINA", "BLAINE", "GREEN"],
  last_leader: null,
  pending_leader: "BROCK",
  trial_count: 0,
  trial_started: false,
  trial_cleared: false,
  trial_floor: 10,
  result: "preparation_required",
};
startSafariBoundaryTrialBattle(runtime);

assert.equal(state.battle.player_party_index, 0);
assert.deepEqual(state.battle.player_party_order, runtime.player.party.map((_, index) => index));

const playerParty = runtime.player.party.map((pokemon) => structuredClone(pokemon));
assert.ok(playerParty.length >= 2, "boundary replacement smoke requires a reserve Pokemon");
playerParty[0] = { ...playerParty[0], hp: 0, fainted: true, active: true };
playerParty[1] = { ...playerParty[1], hp: Math.max(1, Number(playerParty[1].hp ?? 1)), fainted: false, active: false };
runtime.player.party = structuredClone(playerParty);
state.battle.player_replacement_required = true;
state.battle.player_replacement_handoff = {
  decision: 0,
  playerParty,
  foeParty: structuredClone(state.battle.trainer_party),
  playerActivePartyIndex: 0,
  foeActivePartyIndex: Number(state.battle.trainer_party_index),
  playerActiveFainted: true,
  foeActiveFainted: false,
  playerReplacementRequired: true,
  foeReplacementRequired: false,
};

const pending = resolveSafariBoundaryPlayerReplacement(runtime);
assert.equal(pending.result, "replacement_selection_required");
assert.equal(pending.playerReplacementRequired, true);
assert.equal(pending.playerReplacementContinuation.replacementOptions[0].canSwitchIn, false);
assert.equal(pending.playerReplacementContinuation.replacementOptions[1].canSwitchIn, true);
assert.equal(state.battle.player_party_index, 0, "Battle must not auto-select a reserve for the player");

const continued = resolveSafariBoundaryPlayerReplacement(runtime, 1);
assert.equal(continued.result, "continued_with_replacement");
assert.equal(continued.playerReplacementRequired, false);
assert.equal(state.battle.player_party_index, 1);
assert.equal(runtime.player.party[1].active, true);
assert.equal(runtime.player.party[0].active, false);
assert.equal(state.battle.player_replacement_required, false);
assert.equal(state.battle.player_replacement_handoff, null);
assert.ok(continued.operations.some((operation) => operation.op === "send_out"));

console.log("Safari boundary player replacement smoke: ok");
