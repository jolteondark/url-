export * from "./battle-ability-item-hook-dispatch-pre-gems.js";

import {
  BATTLE_ABILITY_ITEM_SHARED_HOOK_CONTRACT_CANONICAL as BASE_HOOK_CONTRACT,
  BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL as BASE_COVERAGE,
  resolveBattleAbilityItemHookCanonical as resolveBaseBattleAbilityItemHookCanonical,
} from "./battle-ability-item-hook-dispatch-pre-gems.js";
import {
  BATTLE_HELD_GEM_COVERAGE_CANONICAL,
  resolveHeldGemPowerCanonical,
} from "./item-held-gem-effects.js";

function phaseId(value) {
  return String(value ?? "").trim().toLowerCase();
}

function multiplyFinite(a, b) {
  const left = Number(a ?? 1);
  const right = Number(b ?? 1);
  if (!Number.isFinite(left) || !Number.isFinite(right)) throw new TypeError("battle damage multiplier must be finite");
  return left * right;
}

const abilityIds = Object.freeze([...new Set([
  ...(BASE_COVERAGE.abilityIds ?? []),
  ...(BATTLE_HELD_GEM_COVERAGE_CANONICAL.abilityIds ?? []),
])].sort());
const itemIds = Object.freeze([...new Set([
  ...(BASE_COVERAGE.itemIds ?? []),
  ...(BATTLE_HELD_GEM_COVERAGE_CANONICAL.itemIds ?? []),
])].sort());

export const BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL = Object.freeze({
  ...BASE_COVERAGE,
  abilityIds,
  itemIds,
  abilityCount: abilityIds.length,
  itemCount: itemIds.length,
  classificationCounts: Object.freeze({
    ...(BASE_COVERAGE.classificationCounts ?? {}),
    heldGemExtension: BATTLE_HELD_GEM_COVERAGE_CANONICAL.classificationCounts,
  }),
});

export const BATTLE_ABILITY_ITEM_SHARED_HOOK_CONTRACT_CANONICAL = Object.freeze({
  ...BASE_HOOK_CONTRACT,
  implementedCoverage: BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL,
});

export function resolveBattleAbilityItemHookCanonical(input = {}) {
  const base = resolveBaseBattleAbilityItemHookCanonical(input);
  if (phaseId(input.hook) !== "action_before") return base;
  const resolution = resolveHeldGemPowerCanonical({
    user: input.user ?? {},
    move: input.move ?? {},
    context: input.context ?? {},
  });
  if (!resolution.item) return base;
  if (!resolution.triggered) return Object.freeze({ ...base, userGem: resolution });
  const modifiers = base?.modifiers ?? {};
  const damage = modifiers.damageMultiplierInput ?? {};
  return Object.freeze({
    ...base,
    modifiers: Object.freeze({
      ...modifiers,
      userItem: resolution.item,
      damageMultiplierInput: Object.freeze({
        ...damage,
        externalPowerMultiplier: multiplyFinite(damage.externalPowerMultiplier, resolution.powerMultiplier),
      }),
    }),
    userGem: resolution,
  });
}
