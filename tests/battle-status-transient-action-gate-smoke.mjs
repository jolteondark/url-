import assert from "node:assert/strict";
import { tryUseMoveCanonical } from "../runtime/battle-core-try-use-move.js";
import { prepareCombatTurnInputCanonical } from "../runtime/battle-core-combat-turn.js";
import { resolveGenericTurnVerticalSlice } from "../runtime/battle-core-turn-vertical-slice.js";
import { resolveBrowserBattleRound } from "../runtime/browser-battle-round-runtime.js";

function preparedBlockedAction(tryUseMoveInput) {
  const prepared = prepareCombatTurnInputCanonical({
    combatRandomSeed: 1,
    rounds: [{ actions: [{
      kind: "move",
      battlerIndex: 0,
      targetBattlerIndex: 1,
      moveId: "TACKLE",
      moveIndex: 0,
      useMoveInput: { moveId: "TACKLE", moveIndex: 0, targetIndex: 1, movePresent: true, tryUseMoveInput },
      accuracyInput: { baseAccuracy: 100 },
    }] }],
  });
  return prepared.rounds[0].actions[0];
}

function verticalForFirstAction(action) {
  return resolveGenericTurnVerticalSlice({
    rounds: [{
      priorityOrder: [0, 1],
      actions: [action, {
        kind: "move",
        battlerIndex: 1,
        targetBattlerIndex: 0,
        moveId: "TACKLE",
        moveIndex: 0,
        accuracyHit: true,
        calculatedDamage: 10,
        hpBefore: 100,
        totalHp: 100,
      }],
    }],
  }, { allowIncomplete: true });
}

function assertBlockedAction(action, reason) {
  assert.equal(action.moveSkipped, true);
  assert.equal(action.tryUseMoveResolution.reason, reason);
  const vertical = verticalForFirstAction(action);
  assert.equal(vertical.operations.filter((op) => op.op === "use_move" && Number(op.action) === 0).length, 0, `${reason}: blocked action is not executed`);
  assert.equal(vertical.operations.filter((op) => op.op === "calc_damage" && Number(op.action) === 0).length, 0, `${reason}: blocked action deals no selected-move damage`);
  assert.equal(vertical.operations.filter((op) => op.op === "use_move" && Number(op.action) === 1).length, 1, `${reason}: surviving second actor acts exactly once`);
  assert.equal(vertical.operations.filter((op) => op.op === "cancel_action" && Number(op.action) === 0).length, 1, `${reason}: one cancellation is exposed`);
}

// Sleep decrements before deciding whether the selected move can execute.
const sleeping = tryUseMoveCanonical({ status: "SLEEP", statusCount: 2 });
assert.equal(sleeping.success, false);
assert.equal(sleeping.reason, "sleep");
assert.equal(sleeping.statusCount, 1);
const wakes = tryUseMoveCanonical({ status: "SLEEP", statusCount: 1 });
assert.equal(wakes.success, true);
assert.equal(wakes.statusCount, 0);
assert.ok(wakes.operations.some((op) => op.op === "cure_status_request" && op.status === "SLEEP"));
assertBlockedAction(preparedBlockedAction({ status: "SLEEP", statusCount: 2 }), "sleep");

// Frozen uses canonical 20% thaw at action start; a thawing move bypasses the stop gate.
const staysFrozen = tryUseMoveCanonical({ status: "FROZEN", frozenThawRoll: 20 });
assert.equal(staysFrozen.success, false);
assert.equal(staysFrozen.reason, "frozen");
const randomThaw = tryUseMoveCanonical({ status: "FROZEN", frozenThawRoll: 19 });
assert.equal(randomThaw.success, true);
assert.ok(randomThaw.operations.some((op) => op.op === "cure_status_request" && op.status === "FROZEN"));
assert.equal(tryUseMoveCanonical({ status: "FROZEN", frozenThawRoll: 99, moveThawsUser: true }).success, true);
assertBlockedAction(preparedBlockedAction({ status: "FROZEN", frozenThawRoll: 20 }), "frozen");

// Flinch is a try-use stop, not an executed move. A fresh action has no carried flinch.
assertBlockedAction(preparedBlockedAction({ flinch: true }), "flinch");
assert.equal(prepareCombatTurnInputCanonical({ rounds: [{ actions: [{ kind: "move", useMoveInput: { tryUseMoveInput: {} } }] }] }).rounds[0].actions[0].moveSkipped, false);

// Confusion decrements first; self-hit stops the selected move and damages only the actor.
const confusion = tryUseMoveCanonical({
  confusionTurns: 2,
  confusionRoll: 0,
  mechanicsGeneration: 9,
  confusionDamageInput: {
    hpBefore: 100,
    totalHp: 100,
    damageInput: {
      level: 50,
      attack: 100,
      defense: 100,
      damageMultiplierInput: { confusionMove: true, physicalMove: true, typeMod: 1 },
    },
  },
});
assert.equal(confusion.success, false);
assert.equal(confusion.reason, "confusion_self_hit");
assert.equal(confusion.confusionTurns, 1);
assert.equal(confusion.confusionDamageResolution.resolved, true);
assert.ok(confusion.confusionDamageResolution.hpAfter < 100, "confusion self-hit damages the actor");
const confusionAction = preparedBlockedAction({
  confusionTurns: 2,
  confusionRoll: 0,
  mechanicsGeneration: 9,
  confusionDamageInput: {
    hpBefore: 100,
    totalHp: 100,
    damageInput: { level: 50, attack: 100, defense: 100, damageMultiplierInput: { confusionMove: true, physicalMove: true, typeMod: 1 } },
  },
});
assertBlockedAction(confusionAction, "confusion_self_hit");
const confusionCures = tryUseMoveCanonical({ confusionTurns: 1, confusionRoll: 0, mechanicsGeneration: 9 });
assert.equal(confusionCures.success, true);
assert.equal(confusionCures.confusionTurns, 0);
assert.ok(confusionCures.operations.some((op) => op.op === "cure_confusion_request"));

// Paralysis is source-v0.9.108 pbRandom(100) < 25, and shares the same action-cancel contract.
assertBlockedAction(preparedBlockedAction({ status: "PARALYSIS", paralysisRoll: 24 }), "paralysis");
assert.equal(tryUseMoveCanonical({ status: "PARALYSIS", paralysisRoll: 25 }).success, true);

const MOVE_MASTERS = {
  TACKLE: { id: "TACKLE", name: "Tackle", category: "Physical", power: 40, accuracy: 100, total_pp: 35, priority: 0, type: "NORMAL", usable_when_asleep: false, thaws_user: false },
};
function pokemon(status, statusCount, speed = 100) {
  return {
    species: "EEVEE",
    level: 50,
    hp: 100,
    max_hp: 100,
    status,
    status_count: statusCount,
    types: ["NORMAL"],
    stats: { ATTACK: 100, DEFENSE: 100, SPECIAL_ATTACK: 100, SPECIAL_DEFENSE: 100, SPEED: speed },
    moves: [{ id: "TACKLE", pp: 35, ppup: 0 }],
  };
}
function ordinary(player, combatRandomSeed) {
  const foe = pokemon("NONE", 0, 60);
  return resolveBrowserBattleRound({
    player,
    foe,
    playerParty: [player],
    foeParty: [foe],
    selectedMoveId: "TACKLE",
    foeMoveId: "TACKLE",
    moveMasters: MOVE_MASTERS,
    combatRandomSeed,
    priorityRandomSeed: 1,
  });
}

// Persisted sleep feeds the canonical counter. A blocked turn spends no PP; the wake boundary clears status and then executes.
const sleepBlocked = ordinary(pokemon("SLEEP", 2), 3);
assert.equal(sleepBlocked.player.status, "SLEEP");
assert.equal(sleepBlocked.player.status_count, 1);
assert.equal(sleepBlocked.player.moves[0].pp, 35);
assert.equal(sleepBlocked.foe.hp, 100);
assert.equal(sleepBlocked.operations.filter((op) => op.op === "use_move" && Number(op.action) === 0).length, 0);
const sleepWake = ordinary(pokemon("SLEEP", 1), 3);
assert.equal(sleepWake.player.status, "NONE");
assert.equal(sleepWake.player.status_count, 0);
assert.equal(sleepWake.player.moves[0].pp, 34, "waking action reaches canonical PP stage exactly once");
assert.ok(sleepWake.foe.hp < 100);

// Seed 3 gives the move-use sibling a 96 thaw roll, so frozen action blocks; seed 1 gives 9 and thaws before the move.
const freezeBlocked = ordinary(pokemon("FROZEN", 0), 3);
assert.equal(freezeBlocked.player.status, "FROZEN");
assert.equal(freezeBlocked.player.moves[0].pp, 35);
assert.equal(freezeBlocked.foe.hp, 100);
const freezeThaw = ordinary(pokemon("FROZEN", 0), 1);
assert.equal(freezeThaw.player.status, "NONE");
assert.equal(freezeThaw.player.moves[0].pp, 34);
assert.ok(freezeThaw.foe.hp < 100);

console.log("battle status/transient action gate smoke: ok");
