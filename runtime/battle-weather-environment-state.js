const WEATHER_SUPPRESSING_ABILITIES = new Set(["CLOUDNINE", "AIRLOCK"]);

function abilityId(value) {
  const id = typeof value === "string" ? value : value?.id;
  return String(id ?? "").trim().toUpperCase();
}

function normalizedWeather(value) {
  const weather = String(value ?? "").trim();
  return weather.length > 0 ? weather : null;
}

export function createBattleWeatherEnvironmentState(input = null) {
  if (input == null) return Object.freeze({ weather: null, turns: 0 });
  if (typeof input !== "object" || Array.isArray(input)) throw new TypeError("battle weather environment state must be an object");
  const weather = normalizedWeather(input.weather ?? input.kind ?? null);
  if (weather === null) return Object.freeze({ weather: null, turns: 0 });
  const turns = Math.max(0, Math.trunc(Number(input.turns ?? input.duration ?? 0)));
  return Object.freeze({ weather, turns });
}

export function commitBattleWeatherRequestCanonical(state, request) {
  const current = createBattleWeatherEnvironmentState(state);
  if (request == null) return current;
  if (typeof request !== "object" || Array.isArray(request)) throw new TypeError("battle weather request must be an object");
  const weather = normalizedWeather(request.weather ?? request.kind ?? null);
  if (weather === null) return current;
  const turns = Math.max(0, Math.trunc(Number(request.turns ?? request.duration ?? 0)));
  return Object.freeze({ weather, turns });
}

export function weatherRequestForMoveFunctionCanonical(functionCode) {
  switch (String(functionCode ?? "").trim()) {
    case "StartRainWeather": return Object.freeze({ weather: "Rain", duration: 5 });
    case "StartSunWeather": return Object.freeze({ weather: "Sun", duration: 5 });
    case "StartSandstormWeather": return Object.freeze({ weather: "Sandstorm", duration: 5 });
    case "StartHailWeather": return Object.freeze({ weather: "Hail", duration: 5 });
    case "StartSnowWeather": return Object.freeze({ weather: "Snow", duration: 5 });
    default: return null;
  }
}

export function effectiveBattleWeatherCanonical(state, activeBattlers = []) {
  const current = createBattleWeatherEnvironmentState(state);
  if (current.weather === null) return null;
  const suppresses = (Array.isArray(activeBattlers) ? activeBattlers : [activeBattlers]).some((battler) =>
    WEATHER_SUPPRESSING_ABILITIES.has(abilityId(battler?.ability ?? battler))
  );
  return suppresses ? null : current.weather;
}

export function injectLiveBattleWeatherIntoActionCanonical(action, state, activeBattlers = []) {
  const prepared = structuredClone(action);
  if (!prepared || prepared.kind !== "move") return prepared;
  const effectiveWeather = effectiveBattleWeatherCanonical(state, activeBattlers);
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

export function commitResolvedMoveWeatherCanonical(state, resolvedAction) {
  const current = createBattleWeatherEnvironmentState(state);
  if (!resolvedAction || resolvedAction.kind !== "move") return current;
  if (resolvedAction.moveSkipped === true || resolvedAction.lastMoveFailed === true) return current;
  const request = weatherRequestForMoveFunctionCanonical(resolvedAction.functionCode);
  return request ? commitBattleWeatherRequestCanonical(current, request) : current;
}

export function advanceBattleWeatherEnvironmentEndOfRoundCanonical(state) {
  const current = createBattleWeatherEnvironmentState(state);
  if (current.weather === null || current.turns <= 0) return current;
  const turns = current.turns - 1;
  return turns > 0
    ? Object.freeze({ weather: current.weather, turns })
    : Object.freeze({ weather: null, turns: 0 });
}
