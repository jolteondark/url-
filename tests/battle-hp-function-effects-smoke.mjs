import assert from "node:assert/strict";
import {
  buildRestStatusInputCanonical,
  resolveCanonicalFixedDamage,
  resolveCanonicalHpFunctionEffect,
} from "../runtime/battle-core-hp-function-effects.js";
import { prepareBrowserPartyAwareJudgeStates } from "../runtime/browser-battle-party-judge.js";
import { resolveGenericTurnVerticalSlice } from "../runtime/battle-core-turn-vertical-slice.js";

// Fixed/current-HP damage families use the canonical pre-damage owner.
assert.equal(resolveCanonicalFixedDamage({ functionCode: "FixedDamage20", actorHp: 80, actorLevel: 50, targetHp: 99 }), 20);
assert.equal(resolveCanonicalFixedDamage({ functionCode: "FixedDamage40", actorHp: 80, actorLevel: 50, targetHp: 99 }), 40);
assert.equal(resolveCanonicalFixedDamage({ functionCode: "FixedDamageHalfTargetHP", actorHp: 80, actorLevel: 50, targetHp: 99 }), 50);
assert.equal(resolveCanonicalFixedDamage({ functionCode: "FixedDamageUserLevel", actorHp: 80, actorLevel: 50, targetHp: 99 }), 50);
assert.equal(resolveCanonicalFixedDamage({ functionCode: "UserFaintsFixedDamageUserHP", actorHp: 37, actorLevel: 50, targetHp: 99 }), 37);

// Drain is based only on actual resolved HP loss and caps at max HP.
assert.deepEqual(
  resolveCanonicalHpFunctionEffect({ functionCode: "HealUserByHalfOfDamageDone", resolvedDamage: 30, actorHp: 70, actorMaxHp: 100 }),
  { functionCode: "HealUserByHalfOfDamageDone", hpBefore: 70, hpAfter: 85, heal: 15, selfDamage: 0, selfKo: false, restSleep: false, resolvedDamage: 30, targetAffected: true },
);
assert.equal(resolveCanonicalHpFunctionEffect({ functionCode: "HealUserByHalfOfDamageDone", resolvedDamage: 0, actorHp: 70, actorMaxHp: 100 }).heal, 0);
assert.equal(resolveCanonicalHpFunctionEffect({ functionCode: "HealUserByThreeQuartersOfDamageDone", resolvedDamage: 40, actorHp: 90, actorMaxHp: 100 }).hpAfter, 100);

// Recoil consumes actual resolved HP loss, can KO, and Rock Head suppresses canonical RecoilMove recoil.
assert.equal(resolveCanonicalHpFunctionEffect({ functionCode: "RecoilThirdOfDamageDealt", resolvedDamage: 30, actorHp: 40, actorMaxHp: 100 }).selfDamage, 10);
assert.equal(resolveCanonicalHpFunctionEffect({ functionCode: "RecoilHalfOfDamageDealt", resolvedDamage: 20, actorHp: 9, actorMaxHp: 100 }).hpAfter, 0);
assert.equal(resolveCanonicalHpFunctionEffect({ functionCode: "RecoilThirdOfDamageDealt", resolvedDamage: 30, actorHp: 40, actorMaxHp: 100, actorAbility: "ROCKHEAD" }).selfDamage, 0);

// Recover/Rest and self-KO families.
assert.equal(resolveCanonicalHpFunctionEffect({ functionCode: "HealUserHalfOfTotalHP", actorHp: 80, actorMaxHp: 100 }).hpAfter, 100);
const rest = resolveCanonicalHpFunctionEffect({ functionCode: "HealUserFullyAndFallAsleep", actorHp: 20, actorMaxHp: 100, actorStatus: "BURN" });
assert.equal(rest.hpAfter, 100);
assert.equal(rest.restSleep, true);
assert.equal(buildRestStatusInputCanonical({ functionCode: "HealUserFullyAndFallAsleep", actorStatus: "BURN", actorHp: 20, actorMaxHp: 100, battlerIndex: 0 }).newStatusCount, 3);
assert.equal(buildRestStatusInputCanonical({ functionCode: "HealUserFullyAndFallAsleep", actorStatus: "NONE", actorHp: 100, actorMaxHp: 100, battlerIndex: 0 }), null);
assert.equal(resolveCanonicalHpFunctionEffect({ functionCode: "UserFaintsExplosive", actorHp: 80, actorMaxHp: 100, targetAffected: false }).hpAfter, 0);
assert.equal(resolveCanonicalHpFunctionEffect({ functionCode: "UserLosesHalfOfTotalHP", actorHp: 80, actorMaxHp: 101 }).selfDamage, 51);
assert.equal(resolveCanonicalHpFunctionEffect({ functionCode: "UserLosesHalfOfTotalHPExplosive", actorHp: 80, actorMaxHp: 101 }).selfDamage, 51);
assert.equal(resolveCanonicalHpFunctionEffect({ functionCode: "Struggle", actorHp: 100, actorMaxHp: 101, targetAffected: true, struggle: true }).selfDamage, 25);

// Resolved target HP loss is committed first, then recoil; target KO still pays recoil.
const recoilPrepared = prepareBrowserPartyAwareJudgeStates({ rounds: [{ priorityOrder: [0], actions: [{
  kind: "move", battlerIndex: 0, targetBattlerIndex: 1,
  actorHpBefore: 3, actorTotalHp: 100, hpBefore: 10, totalHp: 10,
  accuracyHit: true, calculatedDamage: 50,
  hpFunctionInput: { functionCode: "RecoilThirdOfDamageDealt", actorStatus: "NONE", actorAbility: "", targetAffected: true },
}]}] }, {
  playerParty: [{ hp: 3, max_hp: 100 }], foeParty: [{ hp: 10, max_hp: 10 }], playerPartyIndex: 0, foePartyIndex: 0,
});
const recoilTurn = resolveGenericTurnVerticalSlice(recoilPrepared, { allowIncomplete: true });
const targetDamage = recoilTurn.operations.find((op) => op.op === "reduce_hp" && op.action === 0);
const recoilDamage = recoilTurn.operations.find((op) => op.op === "reduce_self_hp" && op.action === 0);
assert.equal(targetDamage.amount, 10);
assert.equal(recoilDamage.amount, 3);
assert.equal(recoilDamage.hpAfter, 0);
assert.equal(recoilTurn.decision, 5); // both sides fainted in the same canonical action.

// A recoil KO with a live reserve stops the round before the opponent's queued action.
const replacementPrepared = prepareBrowserPartyAwareJudgeStates({ rounds: [{ priorityOrder: [0, 1], actions: [
  {
    kind: "move", battlerIndex: 0, targetBattlerIndex: 1,
    actorHpBefore: 1, actorTotalHp: 100, hpBefore: 20, totalHp: 20,
    accuracyHit: true, calculatedDamage: 3,
    hpFunctionInput: { functionCode: "RecoilThirdOfDamageDealt", actorStatus: "NONE", actorAbility: "", targetAffected: true },
  },
  {
    kind: "move", battlerIndex: 1, targetBattlerIndex: 0,
    actorHpBefore: 20, actorTotalHp: 20, hpBefore: 1, totalHp: 100,
    accuracyHit: true, calculatedDamage: 10,
  },
]}] }, {
  playerParty: [{ hp: 1, max_hp: 100 }, { hp: 50, max_hp: 50 }], foeParty: [{ hp: 20, max_hp: 20 }], playerPartyIndex: 0, foePartyIndex: 0,
});
const replacementTurn = resolveGenericTurnVerticalSlice(replacementPrepared, { allowIncomplete: true });
assert.equal(replacementTurn.decision, 0);
assert.ok(replacementTurn.operations.some((op) => op.op === "cancel_action" && op.action === 1 && op.reason === "replacement_checkpoint"));
assert.ok(!replacementTurn.operations.some((op) => op.op === "use_move" && op.action === 1));

console.log(JSON.stringify({ ok: true, families: ["fixed", "drain", "recoil", "recover", "rest", "self_ko", "struggle"], resolvedDamageOnly: true, sequential: true }));
