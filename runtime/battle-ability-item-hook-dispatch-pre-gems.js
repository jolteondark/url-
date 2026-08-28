export * from "./battle-ability-item-hook-dispatch-pre-legendary-held-boost.js";

import {
  BATTLE_ABILITY_ITEM_SHARED_HOOK_CONTRACT_CANONICAL as BASE_HOOK_CONTRACT,
  BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL as BASE_COVERAGE,
  resolveBattleAbilityItemHookCanonical as resolveBaseBattleAbilityItemHookCanonical,
} from "./battle-ability-item-hook-dispatch-pre-legendary-held-boost.js";
import {
  BATTLE_LEGENDARY_HELD_BOOST_COVERAGE_CANONICAL,
  resolveHeldLegendaryBoostCanonical,
} from "./item-held-legendary-boost-effects.js";

function phaseId(value) {
  return String(value ?? "").trim().toLowerCase();
}

function multiplyFinite(a, b) {
  const left = Number(a ?? 1);
  const right = Number(b ?? 1);
  if (!Number.isFinite(left) || !Number.isFinite(right)) throw new TypeError("battle damage multiplier must be finite");
  return left * right;
}

function combinedCoverageCanonical() {
  const abilityIds = Object.freeze([...new Set([
    ...(BASE_COVERAGE.abilityIds ?? []),
    ...(BATTLE_LEGENDARY_HELD_BOOST_COVERAGE_CANONICAL.abilityIds ?? []),
  ])].sort());
  const itemIds = Object.freeze([...new Set([
    ...(BASE_COVERAGE.itemIds ?? []),
    ...(BATTLE_LEGENDARY_HELD_BOOST_COVERAGE_CANONICAL.itemIds ?? []),
  ])].sort());
  return Object.freeze({
    abilityIds,
    itemIds,
    abilityCount: abilityIds.length,
    itemCount: itemIds.length,
    classificationCounts: Object.freeze({
      ...(BASE_COVERAGE.classificationCounts ?? {}),
      legendaryHeldBoostExtension: BATTLE_LEGENDARY_HELD_BOOST_COVERAGE_CANONICAL.classificationCounts,
    }),
  });
}

export const BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL = combinedCoverageCanonical();

export const BATTLE_ABILITY_ITEM_SHARED_HOOK_CONTRACT_CANONICAL = Object.freeze({
  ...BASE_HOOK_CONTRACT,
  implementedCoverage: BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL,
});

function actionBeforeWithLegendaryHeldBoost(input, base) {
  const resolution = resolveHeldLegendaryBoostCanonical({ user: input.user ?? {}, move: input.move ?? {} });
  if (!resolution.item) return base;
  if (!resolution.triggered) return Object.freeze({ ...base, userLegendaryHeldBoost: resolution });
  const baseModifiers = base?.modifiers ?? {};
  const baseDamage = baseModifiers.damageMultiplierInput ?? {};
  return Object.freeze({
    ...base,
    modifiers: Object.freeze({
      ...baseModifiers,
      userItem: resolution.item,
      damageMultiplierInput: Object.freeze({
        ...baseDamage,
        externalPowerMultiplier: multiplyFinite(baseDamage.externalPowerMultiplier, resolution.powerMultiplier),
        externalFinalDamageMultiplier: multiplyFinite(baseDamage.externalFinalDamageMultiplier, resolution.finalDamageMultiplier),
      }),
    }),
    userLegendaryHeldBoost: resolution,
  });
}

export function resolveBattleAbilityItemHookCanonical(input = {}) {
  const base = resolveBaseBattleAbilityItemHookCanonical(input);
  if (phaseId(input.hook) !== "action_before") return base;
  return actionBeforeWithLegendaryHeldBoost(input, base);
}
