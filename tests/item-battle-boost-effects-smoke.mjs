import assert from "node:assert/strict";
import {
  BATTLE_BOOST_ITEM_EFFECT_SOURCE,
  isBattleBoostItem,
  resolveBattleBoostItemEffect,
} from "../runtime/item-battle-boost-effects.js";

assert.equal(BATTLE_BOOST_ITEM_EFFECT_SOURCE.mechanicsGeneration, 9);
assert.equal(BATTLE_BOOST_ITEM_EFFECT_SOURCE.xStatItemsRaiseByTwoStages, true);
assert.equal(isBattleBoostItem("xattack"), true);
assert.equal(isBattleBoostItem("direhit"), true);
assert.equal(isBattleBoostItem("guardspec"), true);
assert.equal(isBattleBoostItem("potion"), false);

const xAttack = resolveBattleBoostItemEffect({ itemId: "XATTACK", statStage: 3 });
assert.equal(xAttack.used, true);
assert.equal(xAttack.stat, "ATTACK");
assert.equal(xAttack.stages, 2);
assert.equal(xAttack.statStageAfter, 5);
assert.equal(xAttack.happinessMethod, "battleitem");
assert.equal(resolveBattleBoostItemEffect({ itemId: "XATTACK6", statStage: 4 }).statStageAfter, 6);
assert.equal(resolveBattleBoostItemEffect({ itemId: "XDEFENSE", statStage: 6 }).used, false);
assert.equal(resolveBattleBoostItemEffect({ itemId: "XSPATK3", statStage: -1 }).statStageAfter, 2);
assert.equal(resolveBattleBoostItemEffect({ itemId: "XACCURACY2", statStage: 0 }).statStageAfter, 2);

const direHit = resolveBattleBoostItemEffect({ itemId: "DIREHIT", focusEnergy: 0 });
assert.equal(direHit.focusEnergyAfter, 2);
assert.equal(resolveBattleBoostItemEffect({ itemId: "DIREHIT", focusEnergy: 1 }).used, false);
assert.equal(resolveBattleBoostItemEffect({ itemId: "DIREHIT2", focusEnergy: 1 }).focusEnergyAfter, 2);
assert.equal(resolveBattleBoostItemEffect({ itemId: "DIREHIT3", focusEnergy: 2 }).focusEnergyAfter, 3);

const guardSpec = resolveBattleBoostItemEffect({ itemId: "GUARDSPEC", sideMistTurns: 0 });
assert.equal(guardSpec.sideMistTurnsAfter, 5);
assert.equal(guardSpec.happinessMethod, "battleitem");
assert.equal(resolveBattleBoostItemEffect({ itemId: "GUARDSPEC", sideMistTurns: 2 }).used, false);

assert.deepEqual(resolveBattleBoostItemEffect({ itemId: "POTION" }), {
  itemId: "POTION",
  supported: false,
  used: false,
  result: "unsupported_item",
});

console.log("item battle boost effects smoke: ok");
