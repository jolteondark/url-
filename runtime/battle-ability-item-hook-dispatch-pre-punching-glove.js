export * from "./battle-ability-item-hook-dispatch-base.js";

import {
  BATTLE_ABILITY_ITEM_SHARED_HOOK_CONTRACT_CANONICAL as BASE_HOOK_CONTRACT,
  BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL as BASE_COVERAGE,
  resolveBattleAbilityItemHookCanonical as resolveBaseBattleAbilityItemHookCanonical,
} from "./battle-ability-item-hook-dispatch-base.js";
import {
  BATTLE_RESIST_BERRY_COVERAGE_CANONICAL,
  RESIST_BERRY_TYPE_BY_ITEM_CANONICAL,
  resistBerryHeldItemIdCanonical,
  resolveResistBerryActionAfterCanonical,
  resolveResistBerryDamageCanonical,
} from "./item-held-resist-berry-effects.js";
import {
  BATTLE_TYPE_GEM_COVERAGE_CANONICAL,
  TYPE_GEM_TYPE_BY_ITEM_CANONICAL,
  heldTypeGemItemIdCanonical,
  resolveTypeGemActionAfterCanonical,
  resolveTypeGemActionBeforeCanonical,
} from "./item-held-type-gem-effects.js";

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
    ...(BATTLE_RESIST_BERRY_COVERAGE_CANONICAL.abilityIds ?? []),
    ...(BATTLE_TYPE_GEM_COVERAGE_CANONICAL.abilityIds ?? []),
  ])].sort());
  const itemIds = Object.freeze([...new Set([
    ...(BASE_COVERAGE.itemIds ?? []),
    ...(BATTLE_RESIST_BERRY_COVERAGE_CANONICAL.itemIds ?? []),
    ...(BATTLE_TYPE_GEM_COVERAGE_CANONICAL.itemIds ?? []),
  ])].sort());
  return Object.freeze({
    abilityIds,
    itemIds,
    abilityCount: abilityIds.length,
    itemCount: itemIds.length,
    classificationCounts: Object.freeze({
      ...(BASE_COVERAGE.classificationCounts ?? {}),
      resistBerryExtension: BATTLE_RESIST_BERRY_COVERAGE_CANONICAL.classificationCounts,
      typeGemExtension: BATTLE_TYPE_GEM_COVERAGE_CANONICAL.classificationCounts,
    }),
  });
}

export const BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL = combinedCoverageCanonical();

export const BATTLE_ABILITY_ITEM_SHARED_HOOK_CONTRACT_CANONICAL = Object.freeze({
  ...BASE_HOOK_CONTRACT,
  implementedCoverage: BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL,
});

function actionBeforeWithResistBerry(input, base) {
  const item = resistBerryHeldItemIdCanonical(input.target ?? {});
  const isResistBerry = Boolean(RESIST_BERRY_TYPE_BY_ITEM_CANONICAL[item]);
  const targetForResolution = isResistBerry ? input.target : {};
  const resolution = resolveResistBerryDamageCanonical({
    target: targetForResolution,
    move: input.move,
    typeMod: input.context?.typeMod ?? 1,
  });
  if (!isResistBerry) return base;
  const baseModifiers = base?.modifiers ?? {};
  const baseDamage = baseModifiers.damageMultiplierInput ?? {};
  return Object.freeze({
    ...base,
    modifiers: Object.freeze({
      ...baseModifiers,
      targetItem: item,
      damageMultiplierInput: Object.freeze({
        ...baseDamage,
        externalFinalDamageMultiplier: multiplyFinite(
          baseDamage.externalFinalDamageMultiplier,
          resolution.finalDamageMultiplier,
        ),
      }),
    }),
    targetResistBerry: resolution,
  });
}

function actionBeforeWithTypeGem(input, base) {
  const item = heldTypeGemItemIdCanonical(input.user ?? {});
  if (!item || !TYPE_GEM_TYPE_BY_ITEM_CANONICAL[item]) return base;
  const resolution = resolveTypeGemActionBeforeCanonical({ user: input.user, move: input.move });
  const baseModifiers = base?.modifiers ?? {};
  const baseDamage = baseModifiers.damageMultiplierInput ?? {};
  return Object.freeze({
    ...base,
    modifiers: Object.freeze({
      ...baseModifiers,
      userItem: item,
      damageMultiplierInput: Object.freeze({
        ...baseDamage,
        externalPowerMultiplier: multiplyFinite(
          baseDamage.externalPowerMultiplier,
          resolution.powerMultiplier,
        ),
      }),
    }),
    userTypeGem: resolution,
  });
}

export function resolveBattleAbilityItemHookCanonical(input = {}) {
  const phase = phaseId(input.hook);
  const base = resolveBaseBattleAbilityItemHookCanonical(input);
  if (phase === "action_before") {
    return actionBeforeWithTypeGem(input, actionBeforeWithResistBerry(input, base));
  }
  if (phase !== "action_after") return base;

  let resolved = base;
  const targetResistBerry = resolveResistBerryActionAfterCanonical({
    target: input.target,
    move: input.move,
    typeMod: input.context?.typeMod ?? 1,
    damageDealt: input.damageDealt,
  });
  if (RESIST_BERRY_TYPE_BY_ITEM_CANONICAL[targetResistBerry.item]) {
    resolved = Object.freeze({ ...resolved, targetResistBerry });
  }

  const userTypeGem = resolveTypeGemActionAfterCanonical({
    user: input.user,
    move: input.move,
    damageDealt: input.damageDealt,
  });
  if (TYPE_GEM_TYPE_BY_ITEM_CANONICAL[userTypeGem.item]) {
    resolved = Object.freeze({ ...resolved, userTypeGem });
  }
  return resolved;
}
