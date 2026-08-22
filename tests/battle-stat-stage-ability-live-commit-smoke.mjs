import assert from "node:assert/strict";

import {
  applyBattleStatStageChangesWithAbilitiesCanonical,
} from "../runtime/battle-core-stat-stage-ability-commit.js";

function pokemon(ability, extra = {}) {
  return { ability, ...extra };
}

{
  const result = applyBattleStatStageChangesWithAbilitiesCanonical(
    null,
    [
      { subject: "user", stat: "ATTACK", delta: 1 },
      { subject: "target", stat: "DEFENSE", delta: -1 },
    ],
    0,
    1,
    {
      userPokemon: pokemon("SIMPLE"),
      targetPokemon: pokemon("CONTRARY"),
      sourceKindBySubject: { user: "self", target: "opposing_move" },
    },
  );
  assert.equal(result.state[0].ATTACK, 2, "Simple must double a live self stat-stage change");
  assert.equal(result.state[1].DEFENSE, 1, "Contrary must reverse a live opposing stat drop");
  assert.deepEqual(result.applied.map((entry) => entry.requestedDelta), [2, 1]);
  assert.deepEqual(result.abilityModifiers.map((entry) => entry.source), ["SIMPLE", "CONTRARY"]);
}

{
  const result = applyBattleStatStageChangesWithAbilitiesCanonical(
    null,
    [{ subject: "target", stat: "ATTACK", delta: -1 }],
    0,
    1,
    {
      targetPokemon: pokemon("CONTRARY"),
      sourceKindBySubject: { target: "opposing_move" },
      moldBreaker: true,
    },
  );
  assert.equal(result.state[1].ATTACK, -1, "Mold Breaker must bypass Contrary for an opposing move");
  assert.equal(result.abilityModifiers[0].abilityIgnored, true);
}

{
  const result = applyBattleStatStageChangesWithAbilitiesCanonical(
    { 0: { SPEED: 5 }, 1: {} },
    [{ subject: "user", stat: "SPEED", delta: 1 }],
    0,
    1,
    {
      userPokemon: pokemon("SIMPLE"),
      sourceKindBySubject: { user: "self" },
    },
  );
  assert.equal(result.state[0].SPEED, 6, "existing +6 cap must remain authoritative after Simple doubles the request");
  assert.equal(result.applied[0].requestedDelta, 2);
  assert.equal(result.applied[0].appliedDelta, 1);
}

{
  const result = applyBattleStatStageChangesWithAbilitiesCanonical(
    null,
    [{ subject: "user", stat: "ATTACK", delta: 1 }],
    0,
    1,
    {
      userPokemon: { ability: null, ability_id: "SIMPLE" },
      sourceKindBySubject: { user: "self" },
    },
  );
  assert.equal(result.state[0].ATTACK, 1, "canonical ability=null must suppress a stale Simple alias");
}

{
  const result = applyBattleStatStageChangesWithAbilitiesCanonical(
    null,
    [{ subject: "user", stat: "ATTACK", delta: 1 }],
    0,
    1,
    {
      userPokemon: { ability_id: "SIMPLE" },
      sourceKindBySubject: { user: "self" },
    },
  );
  assert.equal(result.state[0].ATTACK, 2, "legacy-only Pokemon objects remain supported");
}

console.log("battle stat-stage ability live commit smoke: PASS");
