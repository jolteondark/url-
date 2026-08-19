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

{
  const result = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: { ability: null, ability_id: "PRANKSTER", held_item: null, item: "ASSAULTVEST" },
    target: { ability: null, ability_id: "NONE", held_item: null, item: "ASSAULTVEST" },
    move: { id: "GROWL", type: "NORMAL", category: "Status", power: 0 },
  });
  assert.equal(result.priorityModifier, 0);
  assert.equal(result.moveSelection.blocked, false);
  assert.equal(result.damageMultiplierInput.externalDefenseMultiplier, 1);
}

{
  const legacy = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: { ability_id: "PRANKSTER", item: "ASSAULTVEST" },
    target: { item: "ASSAULTVEST" },
    move: { id: "GROWL", type: "NORMAL", category: "Status", power: 0 },
  });
  assert.equal(legacy.priorityModifier, 1);
  assert.equal(legacy.moveSelection.blocked, true);
}

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_before",
    user: pokemon("SANDFORCE", "HARDSTONE"),
    target: pokemon(),
    move: { id: "ROCKSLIDE", type: "ROCK", category: "Physical", power: 75 },
    selectedMoveId: "ROCKSLIDE",
    context: { effectiveWeather: "Sandstorm" },
  });
  assert.equal(result.modifiers.damageMultiplierInput.externalPowerMultiplier, 1.56);
}

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_before",
    user: pokemon("TINTEDLENS", "EXPERTBELT"),
    target: pokemon(),
    move: { id: "SIGNALBEAM", type: "BUG", category: "Special", power: 75 },
    selectedMoveId: "SIGNALBEAM",
    context: { typeMod: 0.5 },
  });
  assert.equal(result.modifiers.damageMultiplierInput.externalFinalDamageMultiplier, 2);
}

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_before",
    user: pokemon("MOLDBREAKER"),
    target: pokemon("FILTER"),
    move: { id: "BRICKBREAK", type: "FIGHTING", category: "Physical", power: 75 },
    selectedMoveId: "BRICKBREAK",
    context: { typeMod: 2 },
  });
  assert.equal(result.modifiers.damageMultiplierInput.externalFinalDamageMultiplier, 1);
}

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_before",
    user: pokemon("MOLDBREAKER"),
    target: pokemon("PRISMARMOR"),
    move: { id: "BRICKBREAK", type: "FIGHTING", category: "Physical", power: 75 },
    selectedMoveId: "BRICKBREAK",
    context: { typeMod: 2 },
  });
  assert.equal(result.modifiers.damageMultiplierInput.externalFinalDamageMultiplier, 0.75);
}

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_before",
    user: pokemon("SNIPER"),
    target: pokemon("DRYSKIN"),
    move: { id: "EMBER", type: "FIRE", category: "Special", power: 40 },
    selectedMoveId: "EMBER",
    context: { critical: true, typeMod: 1 },
  });
  assert.equal(result.modifiers.damageMultiplierInput.externalFinalDamageMultiplier, 1.875);
}

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_before",
    user: pokemon("NONE"),
    target: pokemon("NONE", "BRIGHTPOWDER"),
    move: { id: "TACKLE", type: "NORMAL", category: "Physical", power: 40 },
    selectedMoveId: "TACKLE",
  });
  assert.equal(result.modifiers.accuracyModifierInput.externalAccuracyMultiplier, 0.9);
}

{
  const consumed = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: { ability: null, ability_id: "SANDFORCE", held_item: null, item: "HARDSTONE" },
    target: { ability: null, ability_id: "FILTER", held_item: null, item: "BRIGHTPOWDER" },
    move: { id: "ROCKSLIDE", type: "ROCK", category: "Physical", power: 75 },
    context: { effectiveWeather: "Sandstorm", typeMod: 2, critical: true },
  });
  assert.equal(consumed.damageMultiplierInput.externalPowerMultiplier, 1);
  assert.equal(consumed.damageMultiplierInput.externalFinalDamageMultiplier, 1);
  assert.equal(consumed.accuracyModifierInput.externalAccuracyMultiplier, 1);
}

const coverage = BATTLE_ABILITY_ITEM_SHARED_HOOK_CONTRACT_CANONICAL.implementedCoverage;
for (const ability of ["PRANKSTER", "SUPERLUCK", "SANDFORCE", "TINTEDLENS", "FILTER", "PRISMARMOR", "SNIPER"]) assert.ok(coverage.abilityIds.includes(ability));
for (const item of ["ASSAULTVEST", "SCOPELENS", "RAZORCLAW", "HARDSTONE", "EXPERTBELT", "BRIGHTPOWDER"]) assert.ok(coverage.itemIds.includes(item));
assert.equal(coverage.abilityCount, new Set(coverage.abilityIds).size);
assert.equal(coverage.itemCount, new Set(coverage.itemIds).size);
assert.equal(coverage.classificationCounts.normalPlayExtension.movePriority, 1);
assert.equal(coverage.classificationCounts.normalPlayExtension.criticalStage, 3);
assert.equal(coverage.classificationCounts.normalPlayExtension.moveSelectionRestriction, 1);
assert.equal(coverage.classificationCounts.normalPlayExtension.specialDefenseModifier, 1);
assert.equal(coverage.classificationCounts.normalPlayExtension.typeBoostHeldItems, 18);
assert.equal(coverage.classificationCounts.normalPlayExtension.superEffectiveOffenseModifier, 2);
assert.equal(coverage.classificationCounts.normalPlayExtension.superEffectiveDefenseModifier, 3);
assert.equal(coverage.classificationCounts.normalPlayExtension.targetAccuracyHeldItems, 2);

console.log("battle ability/item normal-play extension smoke: PASS");
