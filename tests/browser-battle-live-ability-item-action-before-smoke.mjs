import assert from "node:assert/strict";
import {
  buildBrowserBattleActionInput,
  buildBrowserBattlePriorityEntry,
} from "../runtime/browser-battle-round-runtime.js";

function pokemon({ ability = "NONE", heldItem = null, status = "NONE", types = ["NORMAL"], speed = 100 } = {}) {
  return {
    species: "EEVEE",
    level: 20,
    hp: 100,
    max_hp: 100,
    status,
    ability,
    held_item: heldItem,
    types,
    stats: {
      ATTACK: 100,
      DEFENSE: 100,
      SPECIAL_ATTACK: 100,
      SPECIAL_DEFENSE: 100,
      SPEED: speed,
    },
    moves: [{ id: "TACKLE", pp: 35, ppup: 0 }],
  };
}

const TACKLE = Object.freeze({
  id: "TACKLE",
  name: "Tackle",
  type: "NORMAL",
  category: "Physical",
  power: 40,
  accuracy: 100,
  total_pp: 35,
  priority: 0,
  function_code: "None",
});

const MUDSLAP = Object.freeze({
  id: "MUDSLAP",
  name: "Mud-Slap",
  type: "GROUND",
  category: "Special",
  power: 20,
  accuracy: 100,
  total_pp: 10,
  priority: 0,
  function_code: "LowerTargetAccuracy1",
});

const GROWL = Object.freeze({
  id: "GROWL",
  name: "Growl",
  type: "NORMAL",
  category: "Status",
  power: 0,
  accuracy: 100,
  total_pp: 40,
  priority: 0,
  function_code: "LowerTargetAttack1",
});

{
  const action = buildBrowserBattleActionInput({
    actor: pokemon({ ability: "TECHNICIAN", heldItem: "CHOICEBAND" }),
    target: pokemon(),
    move: TACKLE,
    moveIndex: 0,
    battlerIndex: 0,
    targetBattlerIndex: 1,
    randomRoll: 0,
    reflectPp: false,
  });
  assert.equal(action.abilityItemActionBefore.modifiers.damageMultiplierInput.externalPowerMultiplier, 1.5);
  assert.equal(action.abilityItemActionBefore.modifiers.damageMultiplierInput.externalAttackMultiplier, 1.5);
  assert.equal(action.damageInput.damageMultiplierInput.externalPowerMultiplier, 1.5);
  assert.equal(action.damageInput.damageMultiplierInput.externalAttackMultiplier, 1.5);
}

{
  const action = buildBrowserBattleActionInput({
    actor: pokemon({ ability: "COMPOUNDEYES", heldItem: "WIDELENS" }),
    target: pokemon(),
    move: TACKLE,
    moveIndex: 0,
    battlerIndex: 0,
    targetBattlerIndex: 1,
    randomRoll: 0,
    reflectPp: false,
  });
  assert.ok(Math.abs(action.accuracyInput.accuracyModifierInput.externalAccuracyMultiplier - 1.43) < 1e-12);
}

{
  const action = buildBrowserBattleActionInput({
    actor: pokemon({ types: ["GROUND"] }),
    target: pokemon({ ability: "LEVITATE" }),
    move: MUDSLAP,
    moveIndex: 0,
    battlerIndex: 0,
    targetBattlerIndex: 1,
    randomRoll: 0,
    reflectPp: false,
  });
  assert.equal(action.abilityItemActionBefore.modifiers.typeImmunity, true);
  assert.equal(action.abilityItemTypeImmunityResolution.targetAbility, "LEVITATE");
  assert.equal(action.damageInput, undefined);
  assert.equal(action.fixedDamageInput, undefined);
  assert.equal(action.hitLoopInput.targetChecks[0].initialSuccessCheckInput.typeIneffective, true);
}

{
  const scarf = pokemon({ heldItem: "CHOICESCARF", speed: 100 });
  const action = buildBrowserBattleActionInput({
    actor: scarf,
    target: pokemon(),
    move: TACKLE,
    moveIndex: 0,
    battlerIndex: 0,
    targetBattlerIndex: 1,
    reflectPp: false,
  });
  const priority = buildBrowserBattlePriorityEntry({
    action,
    pokemon: scarf,
    move: TACKLE,
    statStages: [{ SPEED: 0 }, { SPEED: 0 }],
    actionIndex: 0,
    battlerIndex: 0,
  });
  assert.equal(priority.speed, 150);
  assert.equal(priority.movePriority, 0);
}

{
  const prankster = pokemon({ ability: "PRANKSTER", speed: 100 });
  const action = buildBrowserBattleActionInput({
    actor: prankster,
    target: pokemon(),
    move: GROWL,
    moveIndex: 0,
    battlerIndex: 0,
    targetBattlerIndex: 1,
    reflectPp: false,
  });
  const priority = buildBrowserBattlePriorityEntry({
    action,
    pokemon: prankster,
    move: GROWL,
    statStages: [{ SPEED: 0 }, { SPEED: 0 }],
    actionIndex: 0,
    battlerIndex: 0,
  });
  assert.equal(priority.movePriority, 1);
}

{
  const consumed = pokemon({ heldItem: null });
  consumed.item = "CHOICEBAND";
  const action = buildBrowserBattleActionInput({
    actor: consumed,
    target: pokemon(),
    move: TACKLE,
    moveIndex: 0,
    battlerIndex: 0,
    targetBattlerIndex: 1,
    reflectPp: false,
  });
  assert.equal(action.damageInput.damageMultiplierInput.externalAttackMultiplier, 1);
}

console.log("browser Battle live ability/item action-before smoke: PASS");
