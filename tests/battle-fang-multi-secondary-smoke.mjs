import assert from "node:assert/strict";
import { SAFARI_MOVE_MASTERS } from "../runtime/safari-playable-data.js";
import { prepareReflectedMajorStatusBattleInput } from "../runtime/battle-major-status-runtime-preparation.js";
import { materializeSeededSecondaryEffectsCanonical } from "../runtime/battle-core-seeded-secondary-effect.js";
import { commitBattleSystemsStatusRuntime } from "../runtime/battle-status-runtime-integration.js";

for (const move of [
  { id: "FIREFANG", name: "Fire Fang", type: "FIRE", function_code: "BurnTargetFlinchTarget" },
  { id: "ICEFANG", name: "Ice Fang", type: "ICE", function_code: "FreezeTargetFlinchTarget" },
  { id: "THUNDERFANG", name: "Thunder Fang", type: "ELECTRIC", function_code: "ParalyzeTargetFlinchTarget" },
]) {
  SAFARI_MOVE_MASTERS[move.id] = Object.freeze({
    ...move,
    category: "Physical",
    power: 65,
    accuracy: 95,
    total_pp: 15,
    priority: 0,
    effect_chance: 10,
  });
}

const pokemon = () => ({
  species: "EEVEE",
  level: 20,
  hp: 50,
  max_hp: 50,
  status: "NONE",
  status_count: 0,
  types: ["NORMAL"],
  stats: { ATTACK: 40, DEFENSE: 40, SPECIAL_ATTACK: 40, SPECIAL_DEFENSE: 40, SPEED: 40 },
  moves: [],
});

const actionFor = (moveId) => ({
  combatRandomSeed: 29,
  rounds: [{ actions: [{
    kind: "move",
    battlerIndex: 0,
    targetBattlerIndex: 1,
    moveId,
    accuracyInput: { baseAccuracy: 95, randomRoll: 0 },
  }] }],
});

const damagingTurn = { operations: [
  { op: "use_move", round: 1, action: 0 },
  { op: "reduce_hp", round: 1, action: 0, hpBefore: 50, hpAfter: 30, amount: 20 },
] };

for (const fixture of [
  { moveId: "FIREFANG", expectedStatus: "BURN", statusFunction: "BurnTarget", canonicalFunction: "BurnTargetFlinchTarget" },
  { moveId: "ICEFANG", expectedStatus: "FROZEN", statusFunction: "FreezeTarget", canonicalFunction: "FreezeTargetFlinchTarget" },
  { moveId: "THUNDERFANG", expectedStatus: "PARALYSIS", statusFunction: "ParalyzeTarget", canonicalFunction: "ParalyzeTargetFlinchTarget" },
]) {
  const prepared = prepareReflectedMajorStatusBattleInput({
    battleInput: actionFor(fixture.moveId),
    pokemon: pokemon(),
    reflectedBattlerIndex: 1,
  });
  const action = prepared.rounds[0].actions[0];

  assert.equal(action.secondaryEffectInputs?.length, 2, `${fixture.moveId} must expose flinch + status as independent shared secondaries`);
  assert.equal(action.secondaryEffectInputs[0].functionCode, "FlinchTarget");
  assert.equal(action.secondaryEffectInputs[0].effectChance, 10);
  assert.equal(action.secondaryEffectInputs[1].functionCode, fixture.statusFunction);
  assert.equal(action.secondaryEffectInputs[1].effectChance, 10);
  assert.equal(action.battleStatusInput?.newStatus, fixture.expectedStatus);
  assert.equal(action.battleStatusInput?.secondaryEffectTargetIndex, 1,
    `${fixture.moveId} status commit must follow its own secondary slot rather than the flinch slot`);
  assert.equal(action.secondaryMajorStatusEffectResolution?.source?.canonicalFunctionCode, fixture.canonicalFunction);

  // Independent rolls are the key multi-secondary contract: status must commit
  // when its own roll triggers even if the flinch roll does not.
  action.secondaryEffectInputs[0].randomRoll = 99;
  action.secondaryEffectInputs[1].randomRoll = 0;
  const triggered = materializeSeededSecondaryEffectsCanonical(prepared);
  const triggeredAction = triggered.rounds[0].actions[0];
  triggeredAction.accuracyResolution = { hit: true };
  assert.equal(triggeredAction.secondaryEffectInputs[0].triggered, false);
  assert.equal(triggeredAction.secondaryEffectInputs[1].triggered, true);

  const committed = commitBattleSystemsStatusRuntime({
    battleInput: triggered,
    turn: damagingTurn,
    pokemon: pokemon(),
    reflectedBattlerIndex: 1,
  });
  assert.equal(committed.pokemon.status, fixture.expectedStatus,
    `${fixture.moveId} must persist its status through the existing status owner`);
}

console.log("fang multi-secondary shared contract smoke: ok");
