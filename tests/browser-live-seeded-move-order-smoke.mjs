import assert from "node:assert/strict";
import { buildBrowserBattlePriorityEntry } from "../runtime/browser-battle-round-runtime.js";

function pokemon({ ability = null, heldItem = null, hp = 100, maxHp = 100, speed = 100 } = {}) {
  return {
    ability,
    held_item: heldItem,
    hp,
    max_hp: maxHp,
    status: "NONE",
    stats: { ATTACK: 100, DEFENSE: 100, SPECIAL_ATTACK: 100, SPECIAL_DEFENSE: 100, SPEED: speed },
  };
}

const statStages = { 0: { SPEED: 0 }, 1: { SPEED: 0 } };
const damagingMove = { id: "TACKLE", category: "Physical", priority: 0 };

{
  const entry = buildBrowserBattlePriorityEntry({
    action: {},
    pokemon: pokemon({ ability: "QUICKDRAW" }),
    move: damagingMove,
    statStages,
    actionIndex: 0,
    battlerIndex: 0,
    moveOrderRandomSeed: 3,
  });
  assert.equal(entry.abilitySubPriority, 1, "seeded Quick Draw must reach the live priority entry");
  assert.equal(entry.itemSubPriority, 0);
}

{
  const entry = buildBrowserBattlePriorityEntry({
    action: {},
    pokemon: pokemon({ heldItem: "QUICKCLAW" }),
    move: damagingMove,
    statStages,
    actionIndex: 0,
    battlerIndex: 0,
    moveOrderRandomSeed: 10,
  });
  assert.equal(entry.itemSubPriority, 1, "seeded Quick Claw must reach the live priority entry");
  assert.equal(entry.abilitySubPriority, 0);
}

{
  const entry = buildBrowserBattlePriorityEntry({
    action: {},
    pokemon: pokemon({ heldItem: "CUSTAPBERRY", hp: 20, maxHp: 100 }),
    move: damagingMove,
    statStages,
    actionIndex: 0,
    battlerIndex: 0,
    moveOrderRandomSeed: 0,
  });
  assert.equal(entry.itemSubPriority, 0, "Custap stays inert until its permanent consume request is committed live");
}

{
  const entry = buildBrowserBattlePriorityEntry({
    action: {},
    pokemon: pokemon({ ability: "STALL", speed: 200 }),
    move: { ...damagingMove, priority: 1 },
    statStages,
    actionIndex: 0,
    battlerIndex: 0,
    moveOrderRandomSeed: 3,
  });
  assert.equal(entry.movePriority, 1, "move-order effects must not rewrite the move priority bracket");
  assert.equal(entry.abilitySubPriority, -1);
}

console.log("browser live seeded move-order smoke: PASS");
