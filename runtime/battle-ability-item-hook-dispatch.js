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

function pokemonRuntimeSourceCanonical(pokemon) {
  if (!pokemon || typeof pokemon !== "object" || Array.isArray(pokemon)) return {};
  const source = { ...pokemon };
  if (Object.prototype.hasOwnProperty.call(pokemon, "ability")) source.ability_id = pokemon.ability;
  if (Object.prototype.hasOwnProperty.call(pokemon, "held_item")) source.item = pokemon.held_item;
  return source;
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
  const runtimeUser = pokemonRuntimeSourceCanonical(user);
  const runtimeTarget = pokemonRuntimeSourceCanonical(target);
  if (phase === "switch_in") {
    return resolveSwitchInAbilityItemHookCanonical({ user: runtimeUser, target: runtimeTarget });
  }
  if (phase === "action_before") {
    return resolveActionBeforeAbilityItemHookCanonical({
      user: runtimeUser,
      target: runtimeTarget,
      move,
      selectedMoveId,
      lockedMoveId,
    });
  }
  if (phase === "action_after") {
    return resolveActionAfterAbilityItemHookCanonical({
      user: runtimeUser,
      target: runtimeTarget,
      move,
      damageDealt,
    });
  }
  if (phase === "turn_end") {
    return resolveTurnEndAbilityItemHookCanonical(runtimeUser, context);
  }
  return resolveSurvivalAbilityItemHookCanonical({
    target: runtimeTarget,
    incomingDamage,
    moldBreaker,
  });
}

export const BATTLE_ABILITY_ITEM_SHARED_HOOK_CONTRACT_CANONICAL = Object.freeze({
  hookPoints: BATTLE_ABILITY_ITEM_HOOK_POINTS_CANONICAL,
  boundaries: BATTLE_ABILITY_ITEM_BOUNDARIES_CANONICAL,
  implementedCoverage: BATTLE_ABILITY_ITEM_IMPLEMENTED_COVERAGE_CANONICAL,
  pokemonRuntimeSource: Object.freeze({
    ability: "pokemon.ability (authoritative when present; ability_id is legacy-only fallback)",
    heldItem: "pokemon.held_item (authoritative when present, including null; pokemon.item is legacy-only fallback)",
  }),
  mutationOwnership: Object.freeze({
    switchIn: "battle stat-stage owner",
    actionBefore: "command/action owner",
    actionAfter: "Pokemon HP + held-item lifecycle owners",
    turnEnd: "battle runtime reflection owners",
    survival: "Pokemon HP + held-item lifecycle owners",
  }),
});
