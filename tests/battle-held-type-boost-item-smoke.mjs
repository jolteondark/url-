import assert from "node:assert/strict";
import {
  HELD_TYPE_POWER_BOOST_ITEM_IDS,
  HELD_TYPE_POWER_BOOSTS,
  HELD_TYPE_POWER_BOOST_SOURCE,
  heldTypePowerBoostType,
  heldTypePowerMultiplier,
  isHeldTypePowerBoostItem,
} from "../runtime/item-held-type-boost-effects.js";
import {
  BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL,
  resolveNormalPlayActionBeforeAbilityItemExtensionCanonical,
} from "../runtime/battle-core-ability-item-normal-play-extension.js";
import { resolveBattleAbilityItemHookCanonical } from "../runtime/battle-ability-item-hook-dispatch.js";

const expected = Object.freeze({
  BLACKBELT: "FIGHTING",
  BLACKGLASSES: "DARK",
  CHARCOAL: "FIRE",
  DRAGONFANG: "DRAGON",
  HARDSTONE: "ROCK",
  MAGNET: "ELECTRIC",
  METALCOAT: "STEEL",
  MIRACLESEED: "GRASS",
  MYSTICWATER: "WATER",
  NEVERMELTICE: "ICE",
  POISONBARB: "POISON",
  SHARPBEAK: "FLYING",
  SILKSCARF: "NORMAL",
  SILVERPOWDER: "BUG",
  SOFTSAND: "GROUND",
  SPELLTAG: "GHOST",
  TWISTEDSPOON: "PSYCHIC",
  FAIRYFEATHER: "FAIRY",
  ODDINCENSE: "PSYCHIC",
  ROCKINCENSE: "ROCK",
  ROSEINCENSE: "GRASS",
  SEAINCENSE: "WATER",
  WAVEINCENSE: "WATER",
  FISTPLATE: "FIGHTING",
  DREADPLATE: "DARK",
  FLAMEPLATE: "FIRE",
  DRACOPLATE: "DRAGON",
  STONEPLATE: "ROCK",
  ZAPPLATE: "ELECTRIC",
  IRONPLATE: "STEEL",
  MEADOWPLATE: "GRASS",
  SPLASHPLATE: "WATER",
  ICICLEPLATE: "ICE",
  TOXICPLATE: "POISON",
  SKYPLATE: "FLYING",
  PIXIEPLATE: "FAIRY",
  INSECTPLATE: "BUG",
  EARTHPLATE: "GROUND",
  SPOOKYPLATE: "GHOST",
  MINDPLATE: "PSYCHIC",
});

assert.equal(HELD_TYPE_POWER_BOOST_SOURCE.multiplier, 1.2);
assert.equal(HELD_TYPE_POWER_BOOST_ITEM_IDS.length, 40);
assert.deepEqual(HELD_TYPE_POWER_BOOSTS, expected);
assert.deepEqual(HELD_TYPE_POWER_BOOST_ITEM_IDS, Object.keys(expected).sort());
for (const [itemId, moveType] of Object.entries(expected)) {
  assert.equal(isHeldTypePowerBoostItem(itemId), true, itemId);
  assert.equal(heldTypePowerBoostType(itemId), moveType, itemId);
  assert.equal(heldTypePowerMultiplier({ itemId, moveType }), 1.2, itemId);
  assert.equal(heldTypePowerMultiplier({ itemId, moveType: moveType === "NORMAL" ? "FIRE" : "NORMAL" }), 1, `${itemId} mismatch`);
}
assert.equal(isHeldTypePowerBoostItem("NORMALGEM"), false);
assert.equal(heldTypePowerMultiplier({ itemId: "NORMALGEM", moveType: "NORMAL" }), 1);
assert.equal(heldTypePowerMultiplier({ itemId: null, moveType: "NORMAL" }), 1);

for (const [itemId, moveType] of [["BLACKBELT", "FIGHTING"], ["WAVEINCENSE", "WATER"], ["PIXIEPLATE", "FAIRY"]]) {
  const resolved = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: { held_item: itemId },
    target: {},
    move: { id: "TESTMOVE", type: moveType, category: "Physical", priority: 0 },
    context: { typeMod: 1 },
  });
  assert.equal(resolved.damageMultiplierInput.externalPowerMultiplier, 1.2, `${itemId} extension integration`);
}

const mismatch = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
  user: { held_item: "FISTPLATE" },
  target: {},
  move: { id: "TESTMOVE", type: "NORMAL", category: "Physical", priority: 0 },
  context: { typeMod: 1 },
});
assert.equal(mismatch.damageMultiplierInput.externalPowerMultiplier, 1);
assert.equal(BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL.classificationCounts.typeBoostHeldItems, 40);
for (const itemId of HELD_TYPE_POWER_BOOST_ITEM_IDS) {
  assert.equal(BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL.itemIds.includes(itemId), true, `${itemId} coverage`);
}

const klutz = resolveBattleAbilityItemHookCanonical({
  hook: "action_before",
  user: { ability: "KLUTZ", held_item: "FISTPLATE" },
  target: {},
  move: { id: "TESTMOVE", type: "FIGHTING", category: "Physical", priority: 0 },
  context: { typeMod: 1 },
});
assert.equal(klutz.modifiers.damageMultiplierInput.externalPowerMultiplier, 1, "Klutz suppresses held type boost");

console.log("battle held type boost item smoke: ok");
