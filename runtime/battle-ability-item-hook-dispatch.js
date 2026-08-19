import {
  BATTLE_ABILITY_ITEM_BOUNDARIES_CANONICAL,
  BATTLE_ABILITY_ITEM_IMPLEMENTED_COVERAGE_CANONICAL,
  resolveActionAfterAbilityItemHookCanonical,
  resolveActionBeforeAbilityItemHookCanonical,
  resolveSurvivalAbilityItemHookCanonical,
  resolveSwitchInAbilityItemHookCanonical,
  resolveTurnEndAbilityItemHookCanonical,
} from "./battle-core-ability-item-modifiers.js";

export const BATTLE_ABILITY_ITEM_HOOK_POINTS_CANONICAL = Object.freeze([
  "switch_in",
  "action_before",
  "action_after",
  "turn_end",
  "survival",
]);

function requireHookPoint(hook) {
  const normalized = String(hook ?? "").toLowerCase();
  if (!BATTLE_ABILITY_ITEM_HOOK_POINTS_CANONICAL.includes(normalized)) {
    throw new RangeError(`unsupported battle ability/item hook: ${hook}`);
  }
  return normalized;
}

export function resolveBattleAbilityItemHookCanonical({
  hook,
  user = {},
  target = {},
  move = {},
  selectedMoveId = null,
  lockedMoveId = null,
  damageDealt = 0,
  context = {},
  incomingDamage = 0,
  moldBreaker = false,
} = {}) {
  const phase = requireHookPoint(hook);
  if (phase === "switch_in") {
    return resolveSwitchInAbilityItemHookCanonical({ user, target });
  }
  if (phase === "action_before") {
    return resolveActionBeforeAbilityItemHookCanonical({
      user,
      target,
      move,
      selectedMoveId,
      lockedMoveId,
    });
  }
  if (phase === "action_after") {
    return resolveActionAfterAbilityItemHookCanonical({
      user,
      target,
      move,
      damageDealt,
    });
  }
  if (phase === "turn_end") {
    return resolveTurnEndAbilityItemHookCanonical(user, context);
  }
  return resolveSurvivalAbilityItemHookCanonical({
    target,
    incomingDamage,
    moldBreaker,
  });
}

export const BATTLE_ABILITY_ITEM_SHARED_HOOK_CONTRACT_CANONICAL = Object.freeze({
  hookPoints: BATTLE_ABILITY_ITEM_HOOK_POINTS_CANONICAL,
  boundaries: BATTLE_ABILITY_ITEM_BOUNDARIES_CANONICAL,
  implementedCoverage: BATTLE_ABILITY_ITEM_IMPLEMENTED_COVERAGE_CANONICAL,
  pokemonRuntimeSource: Object.freeze({
    ability: "pokemon.ability",
    heldItem: "pokemon.held_item (pokemon.item compatibility alias accepted by canonical owner)",
  }),
  mutationOwnership: Object.freeze({
    switchIn: "battle stat-stage owner",
    actionBefore: "command/action owner",
    actionAfter: "Pokemon HP + held-item lifecycle owners",
    turnEnd: "battle runtime reflection owners",
    survival: "Pokemon HP + held-item lifecycle owners",
  }),
});
