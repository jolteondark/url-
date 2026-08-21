import { resolveTurnEndAbilityItemHookCanonical } from "./battle-core-ability-item-modifiers.js";
import {
  BATTLE_TURN_END_STATUS_ITEM_EXTENSION_COVERAGE_CANONICAL,
  resolveTurnEndStatusItemExtensionCanonical,
} from "./battle-core-turn-end-status-item-extension.js";

export const BATTLE_ABILITY_ITEM_SHARED_TURN_END_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: BATTLE_TURN_END_STATUS_ITEM_EXTENSION_COVERAGE_CANONICAL.abilityIds,
  itemIds: BATTLE_TURN_END_STATUS_ITEM_EXTENSION_COVERAGE_CANONICAL.itemIds,
  abilityCount: BATTLE_TURN_END_STATUS_ITEM_EXTENSION_COVERAGE_CANONICAL.abilityCount,
  itemCount: BATTLE_TURN_END_STATUS_ITEM_EXTENSION_COVERAGE_CANONICAL.itemCount,
  classificationCounts: Object.freeze({
    turnEndStatusItemExtension: BATTLE_TURN_END_STATUS_ITEM_EXTENSION_COVERAGE_CANONICAL.classificationCounts,
  }),
});

export function resolveSharedBattleAbilityItemTurnEndCanonical({ pokemon = {}, context = {} } = {}) {
  const base = resolveTurnEndAbilityItemHookCanonical(pokemon, context);
  const extension = resolveTurnEndStatusItemExtensionCanonical(pokemon, context);
  const hpDelta = Number(base?.hpDelta ?? 0) + Number(extension?.hpDelta ?? 0);
  const triggered = base?.triggered === true || extension?.triggered === true;
  return Object.freeze({
    ...base,
    triggered,
    hpDelta,
    reason: extension?.reason ?? base?.reason ?? null,
    statusCureRequest: extension?.statusCureRequest ?? null,
    statusCureChanceRequest: extension?.statusCureChanceRequest ?? null,
    turnEndStatusItemExtension: extension,
  });
}
