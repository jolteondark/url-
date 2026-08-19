import assert from "node:assert/strict";
import {
  BATTLE_ABILITY_ITEM_SHARED_HOOK_CONTRACT_CANONICAL,
  resolveBattleAbilityItemHookCanonical,
} from "../runtime/battle-ability-item-hook-dispatch.js";
import {
  resolveNormalPlayActionBeforeAbilityItemExtensionCanonical,
} from "../runtime/battle-core-ability-item-normal-play-extension.js";

const pokemon = (ability = "NONE", heldItem = null, extra = {}) => ({
  ability,
  held_item: heldItem,
  status: "NONE",
  hp: 100,
  max_hp: 100,
  types: ["NORMAL"],
  stats: { ATTACK: 100, DEFENSE: 100, SPECIAL_ATTACK: 100, SPECIAL_DEFENSE: 100, SPEED: 100 },
  ...extra,
});

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_before",
    user: pokemon("PRANKSTER"),
    target: pokemon(),
    move: { id: "GROWL", type: "NORMAL", category: "Status", power: 0 },
    selectedMoveId: "GROWL",
  });
  assert.equal(result.priorityModifier, 1);
}

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_before",
    user: pokemon("SUPERLUCK", "SCOPELENS"),
    target: pokemon(),
    move: { id: "TACKLE", type: "NORMAL", category: "Physical", power: 40 },
    selectedMoveId: "TACKLE",
  });
  assert.equal(result.criticalStageDelta, 2);
}

{
  const blocked = resolveBattleAbilityItemHookCanonical({
    hook: "action_before",
    user: pokemon("NONE", "ASSAULTVEST"),
    target: pokemon(),
    move: { id: "GROWL", type: "NORMAL", category: "Status", power: 0 },
    selectedMoveId: "GROWL",
  });
  assert.equal(blocked.moveSelection.blocked, true);
  assert.equal(blocked.moveSelection.reason, "assault_vest_status_move");

  const allowed = resolveBattleAbilityItemHookCanonical({
    hook: "action_before",
    user: pokemon("NONE", "ASSAULTVEST"),
    target: pokemon(),
    move: { id: "TACKLE", type: "NORMAL", category: "Physical", power: 40 },
    selectedMoveId: "TACKLE",
  });
  assert.equal(allowed.moveSelection.blocked, false);
}

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_before",
    user: pokemon(),
    target: pokemon("FURCOAT", "ASSAULTVEST"),
    move: { id: "THUNDERSHOCK", type: "ELECTRIC", category: "Special", power: 40 },
    selectedMoveId: "THUNDERSHOCK",
  });
  assert.equal(result.modifiers.damageMultiplierInput.externalDefenseMultiplier, 1.5);
}

{
  const consumed = pokemon("NONE", null, { item: "ASSAULTVEST" });
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_before",
    user: consumed,
    target: pokemon(),
    move: { id: "GROWL", type: "NORMAL", category: "Status", power: 0 },
    selectedMoveId: "GROWL",
  });
  assert.equal(result.moveSelection.blocked, false, "held_item=null must suppress a stale Assault Vest alias");
}

// The extension is also a public owner. It must preserve Pokemon Runtime source authority
// even when consumed directly instead of through the shared dispatcher.
{
  const result = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: { ability: null, ability_id: "PRANKSTER", held_item: null, item: "ASSAULTVEST" },
    target: { ability: null, ability_id: "NONE", held_item: null, item: "ASSAULTVEST" },
    move: { id: "GROWL", type: "NORMAL", category: "Status", power: 0 },
  });
  assert.equal(result.priorityModifier, 0, "ability=null must suppress a stale Prankster alias");
  assert.equal(result.moveSelection.blocked, false, "held_item=null must suppress a stale Assault Vest alias");
  assert.equal(result.damageMultiplierInput.externalDefenseMultiplier, 1, "target held_item=null must suppress stale Assault Vest defense");
}

{
  const legacy = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: { ability_id: "PRANKSTER", item: "ASSAULTVEST" },
    target: { item: "ASSAULTVEST" },
    move: { id: "GROWL", type: "NORMAL", category: "Status", power: 0 },
  });
  assert.equal(legacy.priorityModifier, 1, "legacy ability_id remains fallback when ability is absent");
  assert.equal(legacy.moveSelection.blocked, true, "legacy item remains fallback when held_item is absent");
}

const coverage = BATTLE_ABILITY_ITEM_SHARED_HOOK_CONTRACT_CANONICAL.implementedCoverage;
for (const ability of ["PRANKSTER", "SUPERLUCK"]) assert.ok(coverage.abilityIds.includes(ability));
for (const item of ["ASSAULTVEST", "SCOPELENS", "RAZORCLAW"]) assert.ok(coverage.itemIds.includes(item));
assert.equal(coverage.abilityCount, new Set(coverage.abilityIds).size);
assert.equal(coverage.itemCount, new Set(coverage.itemIds).size);
assert.equal(coverage.classificationCounts.normalPlayExtension.movePriority, 1);
assert.equal(coverage.classificationCounts.normalPlayExtension.criticalStage, 3);
assert.equal(coverage.classificationCounts.normalPlayExtension.moveSelectionRestriction, 1);
assert.equal(coverage.classificationCounts.normalPlayExtension.specialDefenseModifier, 1);

console.log("battle ability/item normal-play extension smoke: PASS");
