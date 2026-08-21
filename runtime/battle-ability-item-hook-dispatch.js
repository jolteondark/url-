import {
  BATTLE_ABILITY_ITEM_BOUNDARIES_CANONICAL,
  BATTLE_ABILITY_ITEM_IMPLEMENTED_COVERAGE_CANONICAL,
  resolveActionAfterAbilityItemHookCanonical,
  resolveActionBeforeAbilityItemHookCanonical,
  resolveSurvivalAbilityItemHookCanonical,
  resolveSwitchInAbilityItemHookCanonical,
  resolveTurnEndAbilityItemHookCanonical,
} from "./battle-core-ability-item-modifiers.js";
import {
  BATTLE_ABILITY_ITEM_ENTRY_EXTENSION_COVERAGE_CANONICAL,
  resolveIntimidateEntryReactionCanonical,
} from "./battle-core-ability-item-entry-extension.js";
import {
  BATTLE_ENTRY_WEATHER_COVERAGE_CANONICAL,
  resolveEntryWeatherAbilityItemHookCanonical,
} from "./battle-core-entry-weather-extension.js";
import {
  BATTLE_ENTRY_TERRAIN_COVERAGE_CANONICAL,
  resolveEntryTerrainAbilityItemHookCanonical,
} from "./battle-core-entry-terrain-extension.js";
import {
  BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL,
  resolveNormalPlayActionBeforeAbilityItemExtensionCanonical,
} from "./battle-core-ability-item-normal-play-extension.js";
import {
  BATTLE_STATUS_CURE_BERRY_COVERAGE_CANONICAL,
  resolveStatusCureBerryHookCanonical,
} from "./battle-core-status-cure-berry-extension.js";
import {
  BATTLE_BERRY_CONSUMPTION_SUPPRESSION_COVERAGE_CANONICAL,
  applyBerryConsumptionSuppressionCanonical,
} from "./battle-core-berry-consumption-suppression-extension.js";
import {
  BATTLE_BERRY_ABILITY_COVERAGE_CANONICAL,
  resolveBerryAbilityPreConsumptionCanonical,
  resolveBerryAbilityPostConsumptionCanonical,
} from "./battle-core-berry-ability-extension.js";
import {
  BATTLE_AIR_BALLOON_COVERAGE_CANONICAL,
  resolveAirBalloonActionAfterCanonical,
  resolveAirBalloonActionBeforeCanonical,
} from "./battle-core-air-balloon-extension.js";
import {
  BATTLE_HIT_REACTIVE_HELD_ITEM_COVERAGE_CANONICAL,
  resolveHitReactiveHeldItemActionAfterCanonical,
} from "./battle-core-hit-reactive-held-item-extension.js";
import {
  BATTLE_CONTACT_REACTIVE_COVERAGE_CANONICAL,
  resolveContactReactiveAbilityItemHookCanonical,
} from "./battle-core-contact-reactive-extension.js";
import {
  BATTLE_SHELL_BELL_COVERAGE_CANONICAL,
  resolveShellBellActionAfterCanonical,
} from "./battle-core-shell-bell-extension.js";
import {
  BATTLE_TYPE_IMMUNITY_AFTER_EFFECT_COVERAGE_CANONICAL,
  resolveTypeImmunityAfterEffectHookCanonical,
} from "./battle-core-type-immunity-after-effect-extension.js";

export const BATTLE_ABILITY_ITEM_HOOK_POINTS_CANONICAL = Object.freeze([
  "switch_in",
  "action_before",
  "action_after",
  "turn_end",
  "survival",
]);

export const BATTLE_HELD_ITEM_EFFECT_SUPPRESSION_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze(["KLUTZ"]),
  itemIds: Object.freeze([]),
  abilityCount: 1,
  itemCount: 0,
  classificationCounts: Object.freeze({
    heldItemEffectSuppressionAbilities: 1,
  }),
});

function requireHookPoint(hook) {
  const normalized = String(hook ?? "").toLowerCase();
  if (!BATTLE_ABILITY_ITEM_HOOK_POINTS_CANONICAL.includes(normalized)) {
    throw new RangeError(`unsupported battle ability/item hook: ${hook}`);
  }
  return normalized;
}

function effectIdCanonical(value) {
  if (value && typeof value === "object") {
    return String(value.id ?? value.ID ?? value.name ?? "").trim().toUpperCase();
  }
  return String(value ?? "").trim().toUpperCase();
}

function pokemonRuntimeSourceCanonical(pokemon) {
  if (!pokemon || typeof pokemon !== "object" || Array.isArray(pokemon)) return {};
  const source = { ...pokemon };
  if (Object.prototype.hasOwnProperty.call(pokemon, "ability")) source.ability_id = pokemon.ability;
  if (Object.prototype.hasOwnProperty.call(pokemon, "held_item")) source.item = pokemon.held_item;
  if (effectIdCanonical(source.ability ?? source.ability_id) === "KLUTZ") {
    source.held_item = null;
    source.item = null;
    source.held_item_effect_suppressed = true;
  }
  return source;
}

function combinedCoverageCanonical() {
  const abilityIds = Object.freeze([...new Set([
    ...(BATTLE_ABILITY_ITEM_IMPLEMENTED_COVERAGE_CANONICAL.abilityIds ?? []),
    ...(BATTLE_ABILITY_ITEM_ENTRY_EXTENSION_COVERAGE_CANONICAL.abilityIds ?? []),
    ...(BATTLE_ENTRY_WEATHER_COVERAGE_CANONICAL.abilityIds ?? []),
    ...(BATTLE_ENTRY_TERRAIN_COVERAGE_CANONICAL.abilityIds ?? []),
    ...(BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL.abilityIds ?? []),
    ...(BATTLE_BERRY_CONSUMPTION_SUPPRESSION_COVERAGE_CANONICAL.abilityIds ?? []),
    ...(BATTLE_BERRY_ABILITY_COVERAGE_CANONICAL.abilityIds ?? []),
    ...(BATTLE_CONTACT_REACTIVE_COVERAGE_CANONICAL.abilityIds ?? []),
    ...(BATTLE_TYPE_IMMUNITY_AFTER_EFFECT_COVERAGE_CANONICAL.abilityIds ?? []),
    ...(BATTLE_HELD_ITEM_EFFECT_SUPPRESSION_COVERAGE_CANONICAL.abilityIds ?? []),
  ])].sort());
  const itemIds = Object.freeze([...new Set([
    ...(BATTLE_ABILITY_ITEM_IMPLEMENTED_COVERAGE_CANONICAL.itemIds ?? []),
    ...(BATTLE_ABILITY_ITEM_ENTRY_EXTENSION_COVERAGE_CANONICAL.itemIds ?? []),
    ...(BATTLE_ENTRY_WEATHER_COVERAGE_CANONICAL.itemIds ?? []),
    ...(BATTLE_ENTRY_TERRAIN_COVERAGE_CANONICAL.itemIds ?? []),
    ...(BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL.itemIds ?? []),
    ...(BATTLE_STATUS_CURE_BERRY_COVERAGE_CANONICAL.itemIds ?? []),
    ...(BATTLE_AIR_BALLOON_COVERAGE_CANONICAL.itemIds ?? []),
    ...(BATTLE_HIT_REACTIVE_HELD_ITEM_COVERAGE_CANONICAL.itemIds ?? []),
    ...(BATTLE_CONTACT_REACTIVE_COVERAGE_CANONICAL.itemIds ?? []),
    ...(BATTLE_SHELL_BELL_COVERAGE_CANONICAL.itemIds ?? []),
  ])].sort());
  return Object.freeze({
    abilityIds,
    itemIds,
    abilityCount: abilityIds.length,
    itemCount: itemIds.length,
    classificationCounts: Object.freeze({
      ...BATTLE_ABILITY_ITEM_IMPLEMENTED_COVERAGE_CANONICAL.classificationCounts,
      heldItemEffectSuppressionAbilities: BATTLE_HELD_ITEM_EFFECT_SUPPRESSION_COVERAGE_CANONICAL.classificationCounts.heldItemEffectSuppressionAbilities,
      entryExtension: BATTLE_ABILITY_ITEM_ENTRY_EXTENSION_COVERAGE_CANONICAL.classificationCounts,
      entryWeatherExtension: BATTLE_ENTRY_WEATHER_COVERAGE_CANONICAL.classificationCounts,
      entryTerrainExtension: BATTLE_ENTRY_TERRAIN_COVERAGE_CANONICAL.classificationCounts,
      normalPlayExtension: BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL.classificationCounts,
      berryConsumptionSuppressionExtension: BATTLE_BERRY_CONSUMPTION_SUPPRESSION_COVERAGE_CANONICAL.classificationCounts,
      berryAbilityExtension: BATTLE_BERRY_ABILITY_COVERAGE_CANONICAL.classificationCounts,
      statusCureBerryExtension: BATTLE_STATUS_CURE_BERRY_COVERAGE_CANONICAL.classificationCounts,
      airBalloonExtension: BATTLE_AIR_BALLOON_COVERAGE_CANONICAL.classificationCounts,
      hitReactiveHeldItemExtension: BATTLE_HIT_REACTIVE_HELD_ITEM_COVERAGE_CANONICAL.classificationCounts,
      contactReactiveExtension: BATTLE_CONTACT_REACTIVE_COVERAGE_CANONICAL.classificationCounts,
      shellBellExtension: BATTLE_SHELL_BELL_COVERAGE_CANONICAL.classificationCounts,
      typeImmunityAfterEffectExtension: BATTLE_TYPE_IMMUNITY_AFTER_EFFECT_COVERAGE_CANONICAL.classificationCounts,
    }),
  });
}

export const BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL = combinedCoverageCanonical();

function multiplyFinite(...values) {
  return values.reduce((product, value) => product * Number(value ?? 1), 1);
}

function resolveSharedSwitchInCanonical({ runtimeUser, runtimeTarget, context }) {
  const base = resolveSwitchInAbilityItemHookCanonical({ user: runtimeUser, target: runtimeTarget });
  const reaction = resolveIntimidateEntryReactionCanonical({ source: runtimeUser, target: runtimeTarget });
  const entryWeather = resolveEntryWeatherAbilityItemHookCanonical({ user: runtimeUser, context });
  const entryTerrain = resolveEntryTerrainAbilityItemHookCanonical({ user: runtimeUser, context });
  if (!reaction.applies) {
    return Object.freeze({ ...base, entryReaction: reaction, entryWeather, entryTerrain, consumeRequest: null });
  }
  const baseChanges = reaction.replaceBaseChanges ? [] : [...(base.entry?.changes ?? [])];
  const changes = Object.freeze([...baseChanges, ...(reaction.changes ?? [])]);
  const entry = Object.freeze({
    ...base.entry,
    changes,
    blocked: reaction.blocksAttackDrop ? true : Boolean(base.entry?.blocked),
    reason: reaction.reason === "no_extension_reaction" ? base.entry?.reason : reaction.reason,
  });
  return Object.freeze({
    ...base,
    entry,
    entryReaction: reaction,
    entryWeather,
    entryTerrain,
    consumeRequest: reaction.consumeRequest,
  });
}

function resolveSharedActionBeforeCanonical({ runtimeUser, runtimeTarget, move, selectedMoveId, lockedMoveId, context }) {
  const base = resolveActionBeforeAbilityItemHookCanonical({
    user: runtimeUser,
    target: runtimeTarget,
    move,
    selectedMoveId,
    lockedMoveId,
  });
  const extension = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: runtimeUser,
    target: runtimeTarget,
    move,
    context,
  });
  const airBalloon = resolveAirBalloonActionBeforeCanonical({
    target: runtimeTarget,
    move,
    context,
  });
  const baseDamageMultiplierInput = base?.modifiers?.damageMultiplierInput ?? {};
  const baseAccuracyModifierInput = base?.modifiers?.accuracyModifierInput ?? {};
  const baseSpeedInput = base?.modifiers?.speedInput ?? {};
  const baseSecondaryEffectInput = base?.modifiers?.secondaryEffectInput ?? {};
  const covertCloak = Boolean(extension?.secondaryEffectInput?.targetHasCovertCloak);
  const typeImmunity = Boolean(base?.modifiers?.typeImmunity) || airBalloon.immune;
  const typeImmunityResolution = base?.modifiers?.typeImmunity
    ? base.modifiers.typeImmunityResolution
    : (airBalloon.typeImmunityResolution ?? base?.modifiers?.typeImmunityResolution ?? null);
  return Object.freeze({
    ...base,
    modifiers: Object.freeze({
      ...base.modifiers,
      typeImmunity,
      typeImmunityResolution,
      damageMultiplierInput: Object.freeze({
        ...baseDamageMultiplierInput,
        externalPowerMultiplier: multiplyFinite(
          baseDamageMultiplierInput.externalPowerMultiplier,
          extension.damageMultiplierInput.externalPowerMultiplier,
        ),
        externalAttackMultiplier: multiplyFinite(
          baseDamageMultiplierInput.externalAttackMultiplier,
          extension.damageMultiplierInput.externalAttackMultiplier,
        ),
        externalDefenseMultiplier: multiplyFinite(
          baseDamageMultiplierInput.externalDefenseMultiplier,
          extension.damageMultiplierInput.externalDefenseMultiplier,
        ),
        externalFinalDamageMultiplier: multiplyFinite(
          baseDamageMultiplierInput.externalFinalDamageMultiplier,
          extension.damageMultiplierInput.externalFinalDamageMultiplier,
        ),
      }),
      accuracyModifierInput: Object.freeze({
        ...baseAccuracyModifierInput,
        externalAccuracyMultiplier: multiplyFinite(
          baseAccuracyModifierInput.externalAccuracyMultiplier,
          extension.accuracyModifierInput.externalAccuracyMultiplier,
        ),
      }),
      speedInput: Object.freeze({
        ...baseSpeedInput,
        abilityMultiplier: multiplyFinite(
          baseSpeedInput.abilityMultiplier,
          extension.speedInput.abilityMultiplier,
        ),
      }),
      secondaryEffectInput: Object.freeze({
        ...baseSecondaryEffectInput,
        targetHasCovertCloak: covertCloak,
        targetHasShieldDust: Boolean(baseSecondaryEffectInput.targetHasShieldDust) || covertCloak,
        moldBreaker: covertCloak ? false : baseSecondaryEffectInput.moldBreaker,
      }),
      damageCalculationInput: extension.damageCalculationInput,
    }),
    airBalloon,
    priorityModifier: extension.priorityModifier,
    criticalStageDelta: extension.criticalStageDelta,
    moveSelection: extension.moveSelection,
  });
}

function resolveSharedActionAfterCanonical({ runtimeUser, runtimeTarget, move, damageDealt, context }) {
  const base = resolveActionAfterAbilityItemHookCanonical({
    user: runtimeUser,
    target: runtimeTarget,
    move,
    damageDealt,
  });
  const targetBerryPrepared = resolveBerryAbilityPreConsumptionCanonical({
    pokemon: runtimeTarget,
    berryResolution: base.targetBerry,
  });
  const targetBerry = applyBerryConsumptionSuppressionCanonical(targetBerryPrepared, {
    consumer: runtimeTarget,
    opposing: runtimeUser,
    context,
  });
  const userStatusBerry = applyBerryConsumptionSuppressionCanonical(resolveStatusCureBerryHookCanonical(runtimeUser), {
    consumer: runtimeUser,
    opposing: runtimeTarget,
    context,
  });
  const targetStatusBerry = applyBerryConsumptionSuppressionCanonical(resolveStatusCureBerryHookCanonical(runtimeTarget), {
    consumer: runtimeTarget,
    opposing: runtimeUser,
    context,
  });
  return Object.freeze({
    ...base,
    targetBerry,
    targetBerryAbilityAfterEffect: resolveBerryAbilityPostConsumptionCanonical({
      pokemon: runtimeTarget,
      berryResolution: targetBerry,
    }),
    userStatusBerry,
    userStatusBerryAbilityAfterEffect: resolveBerryAbilityPostConsumptionCanonical({
      pokemon: runtimeUser,
      berryResolution: userStatusBerry,
    }),
    targetStatusBerry,
    targetStatusBerryAbilityAfterEffect: resolveBerryAbilityPostConsumptionCanonical({
      pokemon: runtimeTarget,
      berryResolution: targetStatusBerry,
    }),
    typeImmunityAfterEffect: resolveTypeImmunityAfterEffectHookCanonical({
      target: runtimeTarget,
      typeImmunityResolution: context?.typeImmunityResolution ?? context?.abilityItemTypeImmunityResolution ?? null,
    }),
    targetAirBalloon: resolveAirBalloonActionAfterCanonical({
      target: runtimeTarget,
      move,
      damageDealt,
      context,
    }),
    targetHitReactiveItem: resolveHitReactiveHeldItemActionAfterCanonical({
      target: runtimeTarget,
      move,
      damageDealt,
      context,
    }),
    contactReactive: resolveContactReactiveAbilityItemHookCanonical({
      user: runtimeUser,
      target: runtimeTarget,
      move,
      damageDealt,
      context,
    }),
    userShellBell: resolveShellBellActionAfterCanonical({
      user: runtimeUser,
      damageDealt,
      context,
    }),
  });
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
    return resolveSharedSwitchInCanonical({ runtimeUser, runtimeTarget, context });
  }
  if (phase === "action_before") {
    return resolveSharedActionBeforeCanonical({
      runtimeUser,
      runtimeTarget,
      move,
      selectedMoveId,
      lockedMoveId,
      context,
    });
  }
  if (phase === "action_after") {
    return resolveSharedActionAfterCanonical({
      runtimeUser,
      runtimeTarget,
      move,
      damageDealt,
      context,
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
  implementedCoverage: BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL,
  pokemonRuntimeSource: Object.freeze({
    ability: "pokemon.ability (authoritative when present; ability_id is legacy-only fallback)",
    heldItem: "pokemon.held_item (authoritative when present, including null; pokemon.item is legacy-only fallback)",
  }),
  mutationOwnership: Object.freeze({
    switchIn: "battle stat-stage/weather/terrain owners; consume request goes to held-item lifecycle owner",
    actionBefore: "command/action owner",
    actionAfter: "Pokemon HP/status + held-item lifecycle owners",
    turnEnd: "battle runtime reflection owners",
    survival: "Pokemon HP + held-item lifecycle owners",
  }),
});