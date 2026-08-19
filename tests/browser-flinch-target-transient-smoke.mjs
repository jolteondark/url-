import assert from "node:assert/strict";
import { prepareReflectedMajorStatusBattleInput } from "../runtime/battle-major-status-runtime-preparation.js";
import { prepareCombatTurnInputCanonical } from "../runtime/battle-core-combat-turn.js";

function moveAction({ battlerIndex, targetBattlerIndex, moveId, accuracy = 100, roll = 0, damage = 10 }) {
  return {
    kind: "move",
    battlerIndex,
    targetBattlerIndex,
    moveId,
    actorHpBefore: 100,
    actorTotalHp: 100,
    accuracyInput: { baseAccuracy: accuracy, randomRoll: roll },
    fixedDamageInput: { damage, functionCode: "test" },
    hpBefore: 100,
    totalHp: 100,
    useMoveInput: { tryUseMoveInput: {} },
  };
}

function preparedRound({ priorityOrder = [0, 1], biteAccuracy = 100, biteRoll = 0 } = {}) {
  const raw = {
    combatRandomSeed: 17,
    rounds: [{
      priorityOrder,
      actions: [
        moveAction({ battlerIndex: 0, targetBattlerIndex: 1, moveId: "BITE", accuracy: biteAccuracy, roll: biteRoll }),
        moveAction({ battlerIndex: 1, targetBattlerIndex: 0, moveId: "TACKLE" }),
      ],
    }],
  };
  const reflected = prepareReflectedMajorStatusBattleInput({
    battleInput: raw,
    pokemon: { species: "EEVEE", hp: 100, max_hp: 100, status: "NONE", types: ["NORMAL"] },
    reflectedBattlerIndex: 0,
  });
  const biteSecondary = reflected.rounds[0].actions[0].secondaryEffectInputs?.find((entry) => entry.functionCode === "FlinchTarget");
  assert.ok(biteSecondary, "Bite must expose canonical FlinchTarget secondary input");
  assert.equal(biteSecondary.effectChance, 30, "Bite canonical flinch chance");
  biteSecondary.randomRoll = 0;
  assert.ok(Number.isInteger(reflected.secondaryEffectRandomSeed), "flinch secondary must use seeded secondary owner");
  return prepareCombatTurnInputCanonical(reflected).rounds[0];
}

// A faster Bite that hits and triggers its 30% secondary must make the slower
// battler consume the existing transient pbTryUseMove flinch gate this round.
{
  const round = preparedRound();
  assert.equal(round.actions[0].hpReductionResolution?.amount, 10, "Bite must actually deal damage before flinch applies");
  assert.equal(round.actions[0].secondaryEffectInputs[0].triggered, true, "forced Bite secondary roll must trigger");
  assert.equal(round.actions[1].tryUseMoveResolution?.success, false);
  assert.equal(round.actions[1].tryUseMoveResolution?.reason, "flinch");
  assert.equal(round.actions[1].tryUseMoveResolution?.lastMoveFailed, true);
}

// Flinch cannot reach backward in priority order. If the target already acted,
// the same triggered Bite must not create state that carries into a later turn.
{
  const round = preparedRound({ priorityOrder: [1, 0] });
  assert.equal(round.actions[0].secondaryEffectInputs[0].triggered, true);
  assert.equal(round.actions[1].tryUseMoveResolution?.success, true);
  assert.notEqual(round.actions[1].tryUseMoveResolution?.reason, "flinch");
}

// A triggered secondary roll is not enough by itself. If Bite misses, no
// reduce_hp exists and the target must still act normally.
{
  const round = preparedRound({ biteAccuracy: 1, biteRoll: 99 });
  assert.equal(round.actions[0].accuracyHit, false);
  assert.equal(round.actions[0].hpReductionResolution, undefined);
  assert.equal(round.actions[1].tryUseMoveResolution?.success, true);
  assert.notEqual(round.actions[1].tryUseMoveResolution?.reason, "flinch");
}

console.log("browser FlinchTarget transient smoke PASS");
