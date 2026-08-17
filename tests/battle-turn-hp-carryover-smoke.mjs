import assert from "node:assert/strict";
import {
  reflectBattleCoreBattlerHpToPokemonRuntime,
} from "../runtime/battle-runtime-integration.js";

const pokemon = {
  species: "EEVEE",
  level: 9,
  hp: 30,
  max_hp: 30,
  status: "NONE",
  moves: [],
};

const actionOnlyDamage = {
  operations: [
    { op: "reduce_hp", action: 1, hpBefore: 30, hpAfter: 19 },
  ],
};

const reflectedFallback = reflectBattleCoreBattlerHpToPokemonRuntime(
  pokemon,
  actionOnlyDamage,
  0,
  1,
);
assert.equal(reflectedFallback.hp, 19, "action-index damage must persist when targetBattlerIndex is absent");

const battlerTaggedDamage = {
  operations: [
    { op: "reduce_hp", action: 1, targetBattlerIndex: 0, hpBefore: 30, hpAfter: 17 },
  ],
};
const reflectedTagged = reflectBattleCoreBattlerHpToPokemonRuntime(
  pokemon,
  battlerTaggedDamage,
  0,
  1,
);
assert.equal(reflectedTagged.hp, 17, "targetBattlerIndex remains the preferred HP owner signal");

console.log("battle turn HP carryover smoke: ok");
