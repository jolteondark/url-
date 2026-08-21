import assert from "node:assert/strict";
import {
  BATTLE_TYPE_RESIST_BERRY_COVERAGE_CANONICAL,
  resolveTypeResistBerryActionAfterCanonical,
  resolveTypeResistBerryActionBeforeCanonical,
} from "../runtime/battle-core-type-resist-berry-extension.js";
import { resolveBattleAbilityItemHookCanonical } from "../runtime/battle-ability-item-hook-dispatch.js";

const pokemon = (ability = "NONE", heldItem = null, extra = {}) => ({
  ability,
  held_item: heldItem,
  hp: 100,
  max_hp: 100,
  ...extra,
});
const move = (type, category = "Special", extra = {}) => ({
  id: `${type}MOVE`, type, category, power: category === "Status" ? 0 : 80, ...extra,
});

assert.equal(BATTLE_TYPE_RESIST_BERRY_COVERAGE_CANONICAL.itemCount, 18);
for (const id of ["OCCABERRY", "PASSHOBERRY", "WACANBERRY", "RINDOBERRY", "YACHEBERRY", "CHOPLEBERRY", "KEBIABERRY", "SHUCABERRY", "COBABERRY", "PAYAPABERRY", "TANGABERRY", "CHARTIBERRY", "KASIBBERRY", "HABANBERRY", "COLBURBERRY", "BABIRIBERRY", "CHILANBERRY", "ROSELIBERRY"]) {
  assert.ok(BATTLE_TYPE_RESIST_BERRY_COVERAGE_CANONICAL.itemIds.includes(id), `coverage missing ${id}`);
}

{
  const result = resolveTypeResistBerryActionBeforeCanonical({
    user: pokemon(), target: pokemon("NONE", "OCCABERRY"), move: move("FIRE"), context: { typeMod: 2 },
  });
  assert.equal(result.triggered, true);
  assert.equal(result.damageMultiplier, 0.5);
  assert.equal(result.consumeRequest, null);
}

{
  const result = resolveTypeResistBerryActionBeforeCanonical({
    user: pokemon(), target: pokemon("RIPEN", "OCCABERRY"), move: move("FIRE"), context: { typeMod: 4 },
  });
  assert.equal(result.triggered, true);
  assert.equal(result.damageMultiplier, 0.25);
}

{
  const result = resolveTypeResistBerryActionBeforeCanonical({
    user: pokemon("UNNERVE"), target: pokemon("RIPEN", "OCCABERRY"), move: move("FIRE"), context: { typeMod: 2 },
  });
  assert.equal(result.triggered, false);
  assert.equal(result.blockedByBerrySuppression, true);
  assert.equal(result.damageMultiplier, 1);
}

{
  assert.equal(resolveTypeResistBerryActionBeforeCanonical({
    user: pokemon(), target: pokemon("NONE", "CHILANBERRY"), move: move("NORMAL", "Physical"), context: { typeMod: 1 },
  }).triggered, true);
  assert.equal(resolveTypeResistBerryActionBeforeCanonical({
    user: pokemon(), target: pokemon("NONE", "OCCABERRY"), move: move("FIRE"), context: { typeMod: 1 },
  }).triggered, false);
  assert.equal(resolveTypeResistBerryActionBeforeCanonical({
    user: pokemon(), target: pokemon("NONE", "OCCABERRY"), move: move("FIRE", "Status"), context: { typeMod: 2 },
  }).triggered, false);
  assert.equal(resolveTypeResistBerryActionBeforeCanonical({
    user: pokemon(),
    target: pokemon("NONE", "CHOPLEBERRY"),
    move: move("FIGHTING", "Physical", { power: 0, function_code: "FixedDamageUserLevel" }),
    context: { typeMod: 2 },
  }).triggered, false);
}

{
  const hit = resolveTypeResistBerryActionAfterCanonical({
    user: pokemon(), target: pokemon("NONE", "OCCABERRY"), move: move("FIRE"), damageDealt: 40, context: { typeMod: 2 },
  });
  assert.equal(hit.triggered, true);
  assert.deepEqual(hit.consumeRequest, {
    item: "OCCABERRY",
    itemIsBerry: true,
    effectKind: "type_resist",
    permanent: true,
  });
  assert.equal(resolveTypeResistBerryActionAfterCanonical({
    user: pokemon(), target: pokemon("NONE", "OCCABERRY"), move: move("FIRE"), damageDealt: 0, context: { typeMod: 2 },
  }).triggered, false);
}

{
  const stale = { ability: "NONE", held_item: null, item: "OCCABERRY", hp: 100, max_hp: 100 };
  assert.equal(resolveTypeResistBerryActionBeforeCanonical({
    user: pokemon(), target: stale, move: move("FIRE"), context: { typeMod: 2 },
  }).triggered, false);
}

{
  const before = resolveBattleAbilityItemHookCanonical({
    hook: "action_before",
    user: pokemon(),
    target: pokemon("NONE", "OCCABERRY"),
    move: move("FIRE"),
    context: { typeMod: 2 },
  });
  assert.equal(before.modifiers.damageMultiplierInput.externalFinalDamageMultiplier, 0.5);

  const after = resolveBattleAbilityItemHookCanonical({
    hook: "action_after",
    user: pokemon(),
    target: pokemon("NONE", "OCCABERRY"),
    move: move("FIRE"),
    damageDealt: 40,
    context: { typeMod: 2 },
  });
  assert.equal(after.targetHitReactiveItem.triggered, true);
  assert.equal(after.targetHitReactiveItem.consumeRequest.permanent, true);
}

{
  const unnerve = resolveBattleAbilityItemHookCanonical({
    hook: "action_after",
    user: pokemon("UNNERVE"),
    target: pokemon("RIPEN", "OCCABERRY"),
    move: move("FIRE"),
    damageDealt: 40,
    context: { typeMod: 2 },
  });
  assert.equal(unnerve.targetHitReactiveItem.triggered, false);
  assert.equal(unnerve.targetHitReactiveItem.blockedByBerrySuppression, true);
}

{
  const klutz = resolveBattleAbilityItemHookCanonical({
    hook: "action_before",
    user: pokemon(),
    target: pokemon("KLUTZ", "OCCABERRY"),
    move: move("FIRE"),
    context: { typeMod: 2 },
  });
  assert.equal(klutz.modifiers.damageMultiplierInput.externalFinalDamageMultiplier, 1);
}

console.log("battle type-resist Berry shared hooks smoke: PASS");
