import assert from "node:assert/strict";
import fs from "node:fs";
import { createSafariPlayableRuntime } from "../runtime/safari-playable-integration.js";
import { resolveSafariBoundaryPlayerReplacement } from "../runtime/safari-boundary-player-replacement-central.js";
import { startSafariBoundaryTrialBattle } from "../runtime/safari-boundary-trial-start.js";
import {
  SAFARI_BATTLE_PHASE,
  beginSafariBattleCommand,
  commitSafariBattleResolution,
  ensureSafariBattleOrchestrator,
} from "../runtime/safari-battle-orchestrator.js";

const runtime = createSafariPlayableRuntime();
if (runtime.player.party.length < 2) {
  const reserve = structuredClone(runtime.player.party[0]);
  reserve.hp = Math.max(1, Number(reserve.max_hp ?? reserve.hp ?? 1));
  reserve.fainted = false;
  reserve.active = false;
  reserve.name = `${reserve.name ?? reserve.species ?? "Reserve"} Reserve`;
  runtime.player.party.push(reserve);
}
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

ensureSafariBattleOrchestrator(runtime);
if (state.battle.phase === SAFARI_BATTLE_PHASE.COMMAND) {
  beginSafariBattleCommand(runtime, "move");
  commitSafariBattleResolution(runtime, {
    decision: 0,
    playerReplacementRequired: true,
    operations: [{ op: "faint", target: "player" }],
  }, "move");
}
assert.equal(state.battle.phase, SAFARI_BATTLE_PHASE.REPLACEMENT);

const beforePendingParty = structuredClone(runtime.player.party);
const pending = resolveSafariBoundaryPlayerReplacement(runtime);
assert.equal(pending.result, "replacement_selection_required");
assert.equal(pending.playerReplacementRequired, true);
assert.equal(pending.playerReplacementApplied, false);
assert.equal(pending.playerReplacementContinuation.replacementOptions[0].canSwitchIn, false);
assert.equal(pending.playerReplacementContinuation.replacementOptions[1].canSwitchIn, true);
assert.equal(state.battle.player_party_index, 0, "Battle must not auto-select a reserve for the player");
assert.deepEqual(runtime.player.party, beforePendingParty, "replacement selection must not mutate Party before the central checkpoint");

const continued = resolveSafariBoundaryPlayerReplacement(runtime, 1);
assert.equal(continued.result, "continued_with_replacement");
assert.equal(continued.playerReplacementRequired, false);
assert.equal(continued.playerReplacementApplied, true);
assert.equal(state.battle.player_party_index, 1);
assert.equal(runtime.player.party[1].active, true);
assert.equal(runtime.player.party[0].active, false);
assert.equal(state.battle.player_replacement_required, false);
assert.equal(state.battle.player_replacement_handoff, null);
assert.ok(continued.operations.some((operation) => operation.op === "send_out"));
assert.equal(state.battle.replacement_checkpoint?.side, "player");
assert.equal(state.battle.replacement_checkpoint?.committed, true);
assert.equal(state.battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
assert.deepEqual(
  state.battle.phase_trace.slice(-2).map((step) => step.phase),
  [SAFARI_BATTLE_PHASE.REPLACEMENT, SAFARI_BATTLE_PHASE.COMMAND],
);

const presentationSource = fs.readFileSync(new URL("../battle-player-replacement-presentation.js", import.meta.url), "utf8");
assert.match(presentationSource, /safari-boundary-player-replacement-central\.js/);
assert.match(presentationSource, /battle\?\.origin === "boundary_trial"/);
assert.match(presentationSource, /resolveSafariBoundaryPlayerReplacement\(runtime, partyIndex\)/);

console.log("Safari boundary player replacement -> central REPLACEMENT checkpoint + UI routing: PASS");
