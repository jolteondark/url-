import assert from "node:assert/strict";
import {
  BATTLE_ESCAPE_ITEM_EFFECT_SOURCE,
  isBattleEscapeItem,
  resolveBattleEscapeItemEffect,
} from "../runtime/item-battle-escape-effects.js";

assert.equal(BATTLE_ESCAPE_ITEM_EFFECT_SOURCE.essentialsVersion, "21.1");

for (const itemId of ["POKEDOLL", "FLUFFYTAIL", "POKETOY"]) {
  assert.equal(isBattleEscapeItem(itemId), true);
  assert.deepEqual(resolveBattleEscapeItemEffect({ itemId, wildBattle: true, canRun: true }), {
    itemId,
    supported: true,
    used: true,
    result: "escaped",
    kind: "guaranteed_wild_escape",
    battleUse: "Direct",
    battleDecision: 3,
  });
  assert.equal(resolveBattleEscapeItemEffect({ itemId, wildBattle: false, canRun: true }).used, false);
  assert.equal(resolveBattleEscapeItemEffect({ itemId, wildBattle: true, canRun: false }).used, false);
}

assert.equal(isBattleEscapeItem("POTION"), false);
assert.deepEqual(resolveBattleEscapeItemEffect({ itemId: "POTION", wildBattle: true, canRun: true }), {
  itemId: "POTION",
  supported: false,
  used: false,
  result: "unsupported_item",
});

console.log("item-battle-escape-effects smoke: ok");
