import assert from "node:assert/strict";

import { prepareReflectedMajorStatusBattleInput } from "../runtime/battle-major-status-runtime-preparation.js";
import { commitBattleSystemsStatusRuntime } from "../runtime/battle-status-runtime-integration.js";
import { projectSafariGeneralMoveEffectChanceV108 } from "../runtime/safari-general-move-effect-chance-facts.js";
import { projectSafariGeneralSecondaryFunctionCodeV108 } from "../runtime/safari-general-move-secondary-function-facts.js";
import { SAFARI_MOVE_MASTERS } from "../runtime/safari-playable-data.js";

function canonicalMoveMaster(moveId, { name, type }) {
  const base = {
    id: moveId,
    name,
    category: "Special",
    power: 40,
    accuracy: 100,
    total_pp: 25,
    priority: 0,
    type,
    thaws_user: false,
  };
  return projectSafariGeneralSecondaryFunctionCodeV108(
    moveId,
    projectSafariGeneralMoveEffectChanceV108(moveId, base),
  );
}

function installTemporaryMove(moveId, master) {
  const previous = Object.getOwnPropertyDescriptor(SAFARI_MOVE_MASTERS, moveId) ?? null;
  Object.defineProperty(SAFARI_MOVE_MASTERS, moveId, {
    configurable: true,
    enumerable: true,
    writable: true,
    value: master,
  });
  return () => {
    if (previous) Object.defineProperty(SAFARI_MOVE_MASTERS, moveId, previous);
    else Reflect.deleteProperty(SAFARI_MOVE_MASTERS, moveId);
  };
}

function targetPokemon() {
  return {
    species: "RATTATA",
    level: 5,
    hp: 20,
    max_hp: 20,
    status: "NONE",
    status_count: 0,
    moves: [],
    types: ["NORMAL"],
  };
}

function preparedStatusAction(moveId) {
  const pokemon = targetPokemon();
  const battleInput = prepareReflectedMajorStatusBattleInput({
    pokemon,
    reflectedBattlerIndex: 1,
    battleInput: {
      combatRandomSeed: 123,
      rounds: [{
        actions: [{
          kind: "move",
          moveId,
          battlerIndex: 0,
          targetBattlerIndex: 1,
        }],
      }],
    },
  });
  return { pokemon, battleInput, action: battleInput.rounds[0].actions[0] };
}

function resolveCommittedStatus(moveId, { triggered = true, hit = true, damage = 5 } = {}) {
  const { pokemon, battleInput, action } = preparedStatusAction(moveId);
  assert.equal(action.secondaryEffectInputs.length, 1, `${moveId} should prepare one status secondary`);
  assert.equal(action.battleStatusInput.secondaryEffectTargetIndex, 0);
  assert.equal(action.battleStatusInput.requiresDamageDealt, true);
  action.secondaryEffectInputs[0] = {
    ...action.secondaryEffectInputs[0],
    triggered,
  };
  action.accuracyResolution = { hit };
  const turn = {
    operations: [
      { op: "use_move", round: 1, action: 0 },
      { op: "reduce_hp", round: 1, action: 0, amount: damage, hpBefore: 20, hpAfter: 20 - damage },
    ],
  };
  return {
    action,
    committed: commitBattleSystemsStatusRuntime({
      battleInput,
      turn,
      pokemon,
      reflectedBattlerIndex: 1,
    }),
  };
}

const restoreEmber = installTemporaryMove("EMBER", canonicalMoveMaster("EMBER", { name: "Ember", type: "FIRE" }));
const restorePowderSnow = installTemporaryMove("POWDERSNOW", canonicalMoveMaster("POWDERSNOW", { name: "Powder Snow", type: "ICE" }));

try {
  for (const [moveId, functionCode, expectedStatus] of [
    ["THUNDERSHOCK", "ParalyzeTarget", "PARALYSIS"],
    ["EMBER", "BurnTarget", "BURN"],
    ["POWDERSNOW", "FreezeTarget", "FROZEN"],
  ]) {
    const { action, committed } = resolveCommittedStatus(moveId);
    assert.equal(action.secondaryEffectInputs[0].effectChance, 10, `${moveId} should keep canonical 10% chance`);
    assert.equal(action.secondaryEffectInputs[0].functionCode, functionCode, `${moveId} should keep canonical FunctionCode`);
    assert.equal(committed.pokemon.status, expectedStatus, `${moveId} proc should persist ${expectedStatus}`);
    assert.equal(committed.commits.length, 1, `${moveId} proc should produce one status commit`);
  }

  assert.equal(resolveCommittedStatus("THUNDERSHOCK", { triggered: false }).committed.pokemon.status, "NONE", "failed proc must not paralyze");
  assert.equal(resolveCommittedStatus("EMBER", { hit: false }).committed.pokemon.status, "NONE", "miss must not burn");
  assert.equal(resolveCommittedStatus("POWDERSNOW", { damage: 0 }).committed.pokemon.status, "NONE", "zero damage must not freeze");
} finally {
  restorePowderSnow();
  restoreEmber();
}

console.log("safari damaging secondary status smoke passed");
