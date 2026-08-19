import assert from "node:assert/strict";
import { tryUseMoveCanonical } from "../runtime/battle-core-try-use-move.js";
import { prepareCombatTurnInputCanonical } from "../runtime/battle-core-combat-turn.js";
import { resolveGenericTurnVerticalSlice } from "../runtime/battle-core-turn-vertical-slice.js";
import { resolveBrowserBattleRound } from "../runtime/browser-battle-round-runtime.js";

function preparedBlocked(tryUseMoveInput) {
  return prepareCombatTurnInputCanonical({ rounds: [{ actions: [{
    kind: "move", battlerIndex: 0, targetBattlerIndex: 1, moveId: "TACKLE", moveIndex: 0,
    useMoveInput: { moveId: "TACKLE", moveIndex: 0, targetIndex: 1, movePresent: true, tryUseMoveInput },
    accuracyInput: { baseAccuracy: 100 },
  }] }] }).rounds[0].actions[0];
}
function assertBlocked(action, reason) {
  assert.equal(action.moveSkipped, true);
  assert.equal(action.tryUseMoveResolution.reason, reason);
  const turn = resolveGenericTurnVerticalSlice({ rounds: [{ priorityOrder: [0, 1], actions: [action, {
    kind: "move", battlerIndex: 1, targetBattlerIndex: 0, moveId: "TACKLE", moveIndex: 0,
    accuracyHit: true, calculatedDamage: 10, hpBefore: 100, totalHp: 100,
  }] }] }, { allowIncomplete: true });
  assert.equal(turn.operations.filter((op) => op.op === "use_move" && op.action === 0).length, 0);
  assert.equal(turn.operations.filter((op) => op.op === "calc_damage" && op.action === 0).length, 0);
  assert.equal(turn.operations.filter((op) => op.op === "use_move" && op.action === 1).length, 1);
}

const sleepBlocked = tryUseMoveCanonical({ status: "SLEEP", statusCount: 2 });
assert.equal(sleepBlocked.reason, "sleep");
assert.equal(sleepBlocked.statusCount, 1);
const wake = tryUseMoveCanonical({ status: "SLEEP", statusCount: 1 });
assert.equal(wake.success, true);
assert.equal(wake.statusCount, 0);
assert.ok(wake.operations.some((op) => op.op === "cure_status_request" && op.status === "SLEEP"));
assertBlocked(preparedBlocked({ status: "SLEEP", statusCount: 2 }), "sleep");

assert.equal(tryUseMoveCanonical({ status: "FROZEN", frozenThawRoll: 20 }).reason, "frozen");
assert.equal(tryUseMoveCanonical({ status: "FROZEN", frozenThawRoll: 19 }).success, true);
assert.equal(tryUseMoveCanonical({ status: "FROZEN", frozenThawRoll: 99, moveThawsUser: true }).success, true);
assertBlocked(preparedBlocked({ status: "FROZEN", frozenThawRoll: 20 }), "frozen");

assertBlocked(preparedBlocked({ flinch: true }), "flinch");
assert.equal(prepareCombatTurnInputCanonical({ rounds: [{ actions: [{ kind: "move", useMoveInput: { tryUseMoveInput: {} } }] }] }).rounds[0].actions[0].moveSkipped, false,
  "flinch must not persist into a fresh round action");

const confused = tryUseMoveCanonical({ confusionTurns: 2, confusionRoll: 0, mechanicsGeneration: 9, confusionDamageInput: {
  hpBefore: 100, totalHp: 100,
  damageInput: { level: 50, attack: 100, defense: 100, damageMultiplierInput: { confusionMove: true, physicalMove: true, typeMod: 1 } },
} });
assert.equal(confused.reason, "confusion_self_hit");
assert.equal(confused.confusionTurns, 1);
assert.ok(confused.confusionDamageResolution.hpAfter < 100);
assert.equal(tryUseMoveCanonical({ confusionTurns: 1, confusionRoll: 0, mechanicsGeneration: 9 }).success, true);
assertBlocked(preparedBlocked({ confusionTurns: 2, confusionRoll: 0, mechanicsGeneration: 9, confusionDamageInput: {
  hpBefore: 100, totalHp: 100,
  damageInput: { level: 50, attack: 100, defense: 100, damageMultiplierInput: { confusionMove: true, physicalMove: true, typeMod: 1 } },
} }), "confusion_self_hit");

const MOVE_MASTERS = { TACKLE: { id: "TACKLE", name: "Tackle", category: "Physical", power: 40, accuracy: 100, total_pp: 35, priority: 0, type: "NORMAL", usable_when_asleep: false, thaws_user: false } };
function mon(status, count, speed = 100) { return { species: "EEVEE", level: 50, hp: 100, max_hp: 100, status, status_count: count, types: ["NORMAL"], stats: { ATTACK: 100, DEFENSE: 100, SPECIAL_ATTACK: 100, SPECIAL_DEFENSE: 100, SPEED: speed }, moves: [{ id: "TACKLE", pp: 35, ppup: 0 }] }; }
function round(player, seed) { const foe = mon("NONE", 0, 60); return resolveBrowserBattleRound({ player, foe, playerParty: [player], foeParty: [foe], selectedMoveId: "TACKLE", foeMoveId: "TACKLE", moveMasters: MOVE_MASTERS, combatRandomSeed: seed, priorityRandomSeed: 1 }); }

const asleep = round(mon("SLEEP", 2), 3);
assert.equal(asleep.player.status, "SLEEP");
assert.equal(asleep.player.status_count, 1);
assert.equal(asleep.player.moves[0].pp, 35);
assert.equal(asleep.foe.hp, 100);
const awoke = round(mon("SLEEP", 1), 3);
assert.equal(awoke.player.status, "NONE");
assert.equal(awoke.player.status_count, 0);
assert.equal(awoke.player.moves[0].pp, 34);

const frozen = round(mon("FROZEN", 0), 3);
assert.equal(frozen.player.status, "FROZEN");
assert.equal(frozen.player.moves[0].pp, 35);
const thawed = round(mon("FROZEN", 0), 1);
assert.equal(thawed.player.status, "NONE");
assert.equal(thawed.player.moves[0].pp, 34);

console.log("battle status/transient action gate smoke: ok");
