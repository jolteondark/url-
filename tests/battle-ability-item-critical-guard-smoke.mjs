import assert from "node:assert/strict";
import {
  BATTLE_ABILITY_ITEM_SHARED_HOOK_CONTRACT_CANONICAL,
  resolveBattleAbilityItemHookCanonical,
} from "../runtime/battle-ability-item-hook-dispatch.js";
import {
  BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL,
  resolveNormalPlayActionBeforeAbilityItemExtensionCanonical,
} from "../runtime/battle-core-ability-item-normal-play-extension.js";

const pokemon = (ability = "NONE", extra = {}) => ({
  ability,
  held_item: null,
  hp: 100,
  max_hp: 100,
  status: "NONE",
  types: ["NORMAL"],
  ...extra,
});

for (const ability of ["BATTLEARMOR", "SHELLARMOR"]) {
  const direct = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: pokemon(),
    target: pokemon(ability),
    move: { id: "SLASH", type: "NORMAL", category: "Physical", power: 70 },
  });
  assert.equal(direct.criticalHitPrevention.blocked, true, ability);
  assert.equal(direct.criticalHitPrevention.targetAbility, ability);
  assert.equal(direct.criticalHitPrevention.moldBreaker, false);

  const shared = resolveBattleAbilityItemHookCanonical({
    hook: "action_before",
    user: pokemon(),
    target: pokemon(ability),
    move: { id: "SLASH", type: "NORMAL", category: "Physical", power: 70 },
    selectedMoveId: "SLASH",
  });
  assert.equal(shared.criticalHitPrevention.blocked, true, `${ability} shared hook`);
}

for (const ability of ["MOLDBREAKER", "TERAVOLT", "TURBOBLAZE"]) {
  const bypassed = resolveBattleAbilityItemHookCanonical({
    hook: "action_before",
    user: pokemon(ability),
    target: pokemon("BATTLEARMOR"),
    move: { id: "SLASH", type: "NORMAL", category: "Physical", power: 70 },
    selectedMoveId: "SLASH",
  });
  assert.equal(bypassed.criticalHitPrevention.blocked, false, `${ability} bypass`);
  assert.equal(bypassed.criticalHitPrevention.moldBreaker, true);
}

{
  const stale = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: pokemon(),
    target: { ability: null, ability_id: "SHELLARMOR", held_item: null },
    move: { id: "SLASH", type: "NORMAL", category: "Physical", power: 70 },
  });
  assert.equal(stale.criticalHitPrevention.blocked, false, "ability=null must suppress stale ability_id");
}

{
  const legacy = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: { ability_id: "NONE" },
    target: { ability_id: "SHELLARMOR" },
    move: { id: "SLASH", type: "NORMAL", category: "Physical", power: 70 },
  });
  assert.equal(legacy.criticalHitPrevention.blocked, true, "legacy objects still use ability_id fallback");
}

const extensionCoverage = BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL;
for (const ability of ["BATTLEARMOR", "SHELLARMOR"]) assert.ok(extensionCoverage.abilityIds.includes(ability));
assert.equal(extensionCoverage.classificationCounts.criticalHitPreventionAbilities, 2);

const sharedCoverage = BATTLE_ABILITY_ITEM_SHARED_HOOK_CONTRACT_CANONICAL.implementedCoverage;
for (const ability of ["BATTLEARMOR", "SHELLARMOR"]) assert.ok(sharedCoverage.abilityIds.includes(ability));
assert.equal(sharedCoverage.classificationCounts.normalPlayExtension.criticalHitPreventionAbilities, 2);

console.log("battle ability/item critical guard smoke: PASS");
