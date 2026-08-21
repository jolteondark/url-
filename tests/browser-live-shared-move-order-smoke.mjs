import assert from "node:assert/strict";
import { resolvePriorityCanonical } from "../runtime/battle-core-priority.js";
import { resolveBattleAbilityItemHookCanonical } from "../runtime/battle-ability-item-hook-dispatch.js";
import { buildBrowserBattlePriorityEntry } from "../runtime/browser-battle-round-runtime.js";

function pokemon({ ability = null, heldItem = null, speed = 100, hp = 100, maxHp = 100 } = {}) {
  return {
    ability,
    held_item: heldItem,
    hp,
    max_hp: maxHp,
    status: "NONE",
    types: ["NORMAL"],
    stats: {
      ATTACK: 100,
      DEFENSE: 100,
      SPECIAL_ATTACK: 100,
      SPECIAL_DEFENSE: 100,
      SPEED: speed,
    },
  };
}

function move({ id = "TACKLE", category = "Physical", priority = 0, power = 40 } = {}) {
  return { id, type: "NORMAL", category, priority, power, accuracy: 100 };
}

function liveEntry({ actor, target, selectedMove, actionIndex, battlerIndex }) {
  const abilityItemActionBefore = resolveBattleAbilityItemHookCanonical({
    hook: "action_before",
    user: actor,
    target,
    move: selectedMove,
    selectedMoveId: selectedMove.id,
  });
  return buildBrowserBattlePriorityEntry({
    action: { abilityItemActionBefore },
    pokemon: actor,
    move: selectedMove,
    statStages: null,
    actionIndex,
    battlerIndex,
  });
}

function order(entries) {
  return resolvePriorityCanonical({ fullCalc: true, entries, randomOrder: [0, 1] }).order;
}

{
  const fastStall = liveEntry({
    actor: pokemon({ ability: "STALL", speed: 200 }),
    target: pokemon({ speed: 50 }),
    selectedMove: move(),
    actionIndex: 0,
    battlerIndex: 0,
  });
  const slowNormal = liveEntry({
    actor: pokemon({ speed: 50 }),
    target: pokemon({ ability: "STALL", speed: 200 }),
    selectedMove: move(),
    actionIndex: 1,
    battlerIndex: 1,
  });
  assert.equal(fastStall.abilitySubPriority, -1, "Stall must enter the live same-priority move-last class");
  assert.equal(fastStall.movePriority, 0, "Stall must not rewrite move priority");
  assert.deepEqual(order([fastStall, slowNormal]), [1, 0]);
}

{
  const fastLaggingTail = liveEntry({
    actor: pokemon({ heldItem: "LAGGINGTAIL", speed: 200 }),
    target: pokemon({ speed: 50 }),
    selectedMove: move(),
    actionIndex: 0,
    battlerIndex: 0,
  });
  const slowNormal = liveEntry({
    actor: pokemon({ speed: 50 }),
    target: pokemon({ heldItem: "LAGGINGTAIL", speed: 200 }),
    selectedMove: move(),
    actionIndex: 1,
    battlerIndex: 1,
  });
  assert.equal(fastLaggingTail.itemSubPriority, -1, "Lagging Tail must enter the live same-priority move-last class");
  assert.deepEqual(order([fastLaggingTail, slowNormal]), [1, 0]);
}

{
  const stallQuickAttack = liveEntry({
    actor: pokemon({ ability: "STALL", speed: 200 }),
    target: pokemon({ speed: 50 }),
    selectedMove: move({ id: "QUICKATTACK", priority: 1 }),
    actionIndex: 0,
    battlerIndex: 0,
  });
  const normalPriorityZero = liveEntry({
    actor: pokemon({ speed: 50 }),
    target: pokemon({ ability: "STALL", speed: 200 }),
    selectedMove: move(),
    actionIndex: 1,
    battlerIndex: 1,
  });
  assert.equal(stallQuickAttack.movePriority, 1);
  assert.equal(stallQuickAttack.abilitySubPriority, -1);
  assert.deepEqual(order([stallQuickAttack, normalPriorityZero]), [0, 1], "move-last effects must remain inside their original priority bracket");
}

{
  const myceliumStatus = liveEntry({
    actor: pokemon({ ability: "MYCELIUMMIGHT", speed: 200 }),
    target: pokemon({ speed: 50 }),
    selectedMove: move({ id: "GROWL", category: "Status", power: 0 }),
    actionIndex: 0,
    battlerIndex: 0,
  });
  const normal = liveEntry({
    actor: pokemon({ speed: 50 }),
    target: pokemon({ ability: "MYCELIUMMIGHT", speed: 200 }),
    selectedMove: move(),
    actionIndex: 1,
    battlerIndex: 1,
  });
  assert.equal(myceliumStatus.abilitySubPriority, -1);
  assert.deepEqual(order([myceliumStatus, normal]), [1, 0]);
}

{
  const myceliumDamage = liveEntry({
    actor: pokemon({ ability: "MYCELIUMMIGHT", speed: 200 }),
    target: pokemon({ speed: 50 }),
    selectedMove: move(),
    actionIndex: 0,
    battlerIndex: 0,
  });
  assert.equal(myceliumDamage.abilitySubPriority, 0, "Mycelium Might must not slow damaging moves");
}

{
  const staleLaggingTail = liveEntry({
    actor: { ...pokemon({ speed: 200 }), held_item: null, item: "LAGGINGTAIL" },
    target: pokemon({ speed: 50 }),
    selectedMove: move(),
    actionIndex: 0,
    battlerIndex: 0,
  });
  assert.equal(staleLaggingTail.itemSubPriority, 0, "canonical held_item=null must suppress stale legacy item aliases");
}

console.log("browser live shared move-order smoke: PASS");
