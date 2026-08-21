import {
  battlePokemonAbilityIdCanonical,
  resolveAbilityStatusEligibilityCanonical,
} from "./battle-core-ability-item-modifiers.js";

const SUNNY_WEATHER = new Set(["SUN", "HARSHSUN"]);
const NON_VOLATILE_STATUSES = new Set(["PARALYSIS", "POISON", "BURN", "FROZEN", "SLEEP"]);

function normalize(value) {
  return String(value ?? "").trim().toUpperCase().replaceAll("_", "").replaceAll("-", "").replaceAll(" ", "");
}

export function resolveWeatherStatusEligibilityCanonical({ target = {}, newStatus, context = {} } = {}) {
  const ability = battlePokemonAbilityIdCanonical(target);
  const status = normalize(newStatus);
  const weather = normalize(context?.effectiveWeather);
  const leafGuardBlocked = ability === "LEAFGUARD" && SUNNY_WEATHER.has(weather) && NON_VOLATILE_STATUSES.has(status);
  return Object.freeze({
    blocked: leafGuardBlocked,
    reason: leafGuardBlocked ? "leaf_guard_sun" : null,
    targetAbility: ability,
    status,
    effectiveWeather: weather,
    source: leafGuardBlocked ? "ability" : null,
  });
}

export function resolveSharedStatusEligibilityCanonical({ target = {}, newStatus, moldBreaker = false, context = {} } = {}) {
  const base = resolveAbilityStatusEligibilityCanonical({ target, newStatus, moldBreaker });
  if (base.statusImmunityAbility) {
    return Object.freeze({
      blocked: true,
      reason: "status_immunity_ability",
      targetAbility: base.targetAbility,
      status: normalize(newStatus),
      source: "ability",
      base,
      weather: null,
    });
  }
  const weather = resolveWeatherStatusEligibilityCanonical({ target, newStatus, context });
  return Object.freeze({
    blocked: weather.blocked,
    reason: weather.reason,
    targetAbility: weather.targetAbility,
    status: weather.status,
    source: weather.source,
    base,
    weather,
  });
}

export const BATTLE_WEATHER_STATUS_ELIGIBILITY_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze(["LEAFGUARD"]),
  abilityCount: 1,
  classificationCounts: Object.freeze({ weatherStatusImmunityAbilities: 1 }),
  boundary: "read-only status eligibility facts; status owner commits or rejects status mutation",
});
