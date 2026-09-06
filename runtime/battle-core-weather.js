const WEATHER_SUPPRESSING_ABILITIES = new Set(["CLOUDNINE", "AIRLOCK"]);

function normalizeAbilityId(value) {
  const id = typeof value === "string" ? value : value?.id;
  return String(id ?? "").trim().toUpperCase();
}

function normalizeWeatherKind(value) {
  const weather = String(value ?? "").trim();
  if (!weather) return null;
  switch (weather.toUpperCase()) {
    case "RAIN": return "Rain";
    case "HEAVYRAIN": return "HeavyRain";
    case "SUN": return "Sun";
    case "HARSHSUN": return "HarshSun";
    case "SANDSTORM": return "Sandstorm";
    case "HAIL": return "Hail";
    case "SNOW": return "Snow";
    case "STRONGWINDS": return "StrongWinds";
    case "SHADOWSKY": return "ShadowSky";
    default: throw new RangeError(`unsupported canonical battle weather: ${weather}`);
  }
}

export function createBattleWeatherStateCanonical(input = null) {
  if (input == null) return Object.freeze({ weather: null, turns: 0 });
  if (typeof input === "string") {
    const weather = normalizeWeatherKind(input);
    return Object.freeze({ weather, turns: weather ? 0 : 0 });
  }
  if (typeof input !== "object" || Array.isArray(input)) throw new TypeError("battle weather state must be an object");
  const weather = normalizeWeatherKind(input.weather ?? input.kind ?? null);
  const turns = Math.max(0, Math.trunc(Number(input.turns ?? input.duration ?? 0)));
  if (weather === null) return Object.freeze({ weather: null, turns: 0 });
  return Object.freeze({ weather, turns });
}

export function startBattleWeatherForFunctionCanonical(state, functionCode) {
  const code = String(functionCode ?? "").trim();
  switch (code) {
    case "StartRainWeather":
      return Object.freeze({ weather: "Rain", turns: 5 });
    case "StartSunWeather":
      return Object.freeze({ weather: "Sun", turns: 5 });
    case "StartSandstormWeather":
      return Object.freeze({ weather: "Sandstorm", turns: 5 });
    case "StartHailWeather":
      return Object.freeze({ weather: "Hail", turns: 5 });
    case "StartSnowWeather":
      return Object.freeze({ weather: "Snow", turns: 5 });
    default:
      return createBattleWeatherStateCanonical(state);
  }
}

export function battleWeatherFunctionSupportedCanonical(functionCode) {
  return new Set([
    "StartRainWeather",
    "StartSunWeather",
    "StartSandstormWeather",
    "StartHailWeather",
    "StartSnowWeather",
  ]).has(String(functionCode ?? "").trim());
}

export function effectiveBattleWeatherCanonical(state, { userAbility = null, targetAbility = null, activeAbilities = null } = {}) {
  const weatherState = createBattleWeatherStateCanonical(state);
  if (weatherState.weather === null) return null;
  const abilities = Array.isArray(activeAbilities)
    ? activeAbilities.map(normalizeAbilityId)
    : [normalizeAbilityId(userAbility), normalizeAbilityId(targetAbility)];
  if (abilities.some((ability) => WEATHER_SUPPRESSING_ABILITIES.has(ability))) return null;
  return weatherState.weather;
}

export function applyEffectiveBattleWeatherToActionCanonical(action, state) {
  const prepared = structuredClone(action);
  if (!prepared || prepared.kind !== "move") return prepared;
  const modifiers = prepared.abilityItemActionBefore?.modifiers ?? {};
  const effectiveWeather = effectiveBattleWeatherCanonical(state, {
    userAbility: prepared.actorAbility ?? modifiers.userAbility,
    targetAbility: prepared.targetAbility ?? modifiers.targetAbility,
  });
  if (prepared.damageInput?.damageMultiplierInput) {
    prepared.damageInput = {
      ...prepared.damageInput,
      damageMultiplierInput: {
        ...prepared.damageInput.damageMultiplierInput,
        effectiveWeather,
      },
    };
  }
  if (prepared.accuracyInput?.accuracyModifierInput) {
    prepared.accuracyInput = {
      ...prepared.accuracyInput,
      accuracyModifierInput: {
        ...prepared.accuracyInput.accuracyModifierInput,
        effectiveWeather,
      },
    };
  }
  prepared.effectiveWeather = effectiveWeather;
  return prepared;
}

export function applyResolvedBattleWeatherMoveCanonical(state, resolvedAction) {
  const current = createBattleWeatherStateCanonical(state);
  if (!resolvedAction || resolvedAction.kind !== "move") return current;
  if (resolvedAction.moveSkipped === true || resolvedAction.lastMoveFailed === true) return current;
  if (!battleWeatherFunctionSupportedCanonical(resolvedAction.functionCode)) return current;
  return startBattleWeatherForFunctionCanonical(current, resolvedAction.functionCode);
}

export function advanceBattleWeatherEndOfRoundCanonical(state) {
  const current = createBattleWeatherStateCanonical(state);
  if (current.weather === null || current.turns <= 0) return current;
  const turns = current.turns - 1;
  return Object.freeze(turns > 0 ? { weather: current.weather, turns } : { weather: null, turns: 0 });
}
