import { resolvePokemonLevelEvolutionWithPartyContext } from "./pokemon-level-evolution-party-context.js";

const LEVEL_CYCLING_SENTINEL = -2147483634;
const LEVEL_SURFING_SENTINEL = -2147483633;
const LEVEL_DIVING_SENTINEL = -2147483632;
const LEVEL_DARKNESS_SENTINEL = -2147483631;

const FIELD_CONTEXT_METHODS = new Set(["LevelCycling", "LevelSurfing", "LevelDiving", "LevelDarkness"]);

function normalizeEvolution(entry) {
  if (Array.isArray(entry)) {
    const [species, method, parameter, prevolution = false] = entry;
    return { species: String(species ?? ""), method: String(method ?? ""), parameter, prevolution: prevolution === true };
  }
  if (!entry || typeof entry !== "object") return null;
  return {
    species: String(entry.species ?? entry.target ?? entry.id ?? ""),
    method: String(entry.method ?? entry.type ?? ""),
    parameter: entry.parameter ?? entry.param ?? entry.level,
    prevolution: (entry.prevolution ?? entry.is_prevolution ?? entry.prevo) === true,
  };
}

function explicitFlag(value) {
  return value === true;
}

function fieldContextSatisfied(method, options = {}) {
  if (method === "LevelCycling") return explicitFlag(options?.cycling ?? options?.bicycle ?? options?.on_bicycle);
  if (method === "LevelSurfing") return explicitFlag(options?.surfing ?? options?.is_surfing);
  if (method === "LevelDiving") return explicitFlag(options?.diving ?? options?.is_diving);
  if (method === "LevelDarkness") return explicitFlag(options?.dark_map ?? options?.darkness ?? options?.is_dark_map);
  return false;
}

function sentinelForMethod(method) {
  if (method === "LevelCycling") return LEVEL_CYCLING_SENTINEL;
  if (method === "LevelSurfing") return LEVEL_SURFING_SENTINEL;
  if (method === "LevelDiving") return LEVEL_DIVING_SENTINEL;
  return LEVEL_DARKNESS_SENTINEL;
}

function methodForSentinel(parameter) {
  if (parameter === LEVEL_CYCLING_SENTINEL) return "LevelCycling";
  if (parameter === LEVEL_SURFING_SENTINEL) return "LevelSurfing";
  if (parameter === LEVEL_DIVING_SENTINEL) return "LevelDiving";
  if (parameter === LEVEL_DARKNESS_SENTINEL) return "LevelDarkness";
  return null;
}

function adaptEvolutionEntry(raw, runtime, options) {
  const evolution = normalizeEvolution(raw);
  if (!evolution || evolution.prevolution || !FIELD_CONTEXT_METHODS.has(evolution.method)) return structuredClone(raw);
  const requiredLevel = Number(evolution.parameter);
  if (!Number.isInteger(requiredLevel) || requiredLevel < 1 || Number(runtime?.level) < requiredLevel) return null;
  if (!fieldContextSatisfied(evolution.method, options)) return null;
  const sentinel = sentinelForMethod(evolution.method);
  if (Array.isArray(raw)) return [evolution.species, "Level", sentinel, evolution.prevolution];
  return {
    ...structuredClone(raw),
    method: "Level",
    type: Object.prototype.hasOwnProperty.call(raw, "type") ? "Level" : raw.type,
    parameter: sentinel,
    param: Object.prototype.hasOwnProperty.call(raw, "param") ? sentinel : raw.param,
    level: Object.prototype.hasOwnProperty.call(raw, "level") ? sentinel : raw.level,
  };
}

function adaptedSpeciesMasters(speciesMasters, runtime, options) {
  const adapted = {};
  for (const [id, master] of Object.entries(speciesMasters ?? {})) {
    if (id !== runtime?.species) {
      adapted[id] = master;
      continue;
    }
    const evolutions = [];
    for (const raw of master?.evolutions ?? []) {
      const next = adaptEvolutionEntry(raw, runtime, options);
      if (next != null) evolutions.push(next);
    }
    adapted[id] = { ...master, evolutions };
  }
  return adapted;
}

function deferredFieldCandidate(sourceMaster, runtime) {
  for (const raw of sourceMaster?.evolutions ?? []) {
    const evolution = normalizeEvolution(raw);
    if (!evolution?.species || evolution.prevolution || !FIELD_CONTEXT_METHODS.has(evolution.method)) continue;
    const requiredLevel = Number(evolution.parameter);
    if (!Number.isInteger(requiredLevel) || requiredLevel < 1 || Number(runtime?.level) < requiredLevel) continue;
    return { to: evolution.species, method: evolution.method, parameter: requiredLevel };
  }
  return null;
}

function relabelFieldResult(result, sourceMaster, runtime, options) {
  if (!result?.evolved || result?.evolution?.method !== "Level") return result;
  const method = methodForSentinel(Number(result?.evolution?.parameter));
  if (!method) return result;
  const matching = (sourceMaster?.evolutions ?? []).map(normalizeEvolution).find((entry) =>
    entry?.species === result.evolution.to
      && entry.method === method
      && !entry.prevolution
      && Number(runtime?.level) >= Number(entry.parameter)
      && fieldContextSatisfied(method, options));
  if (!matching) return result;
  const parameter = Number(matching.parameter);
  const evolution = { ...result.evolution, method, parameter };
  const levelEvolutionCandidate = result.levelEvolutionCandidate
    ? { ...result.levelEvolutionCandidate, method, parameter }
    : null;
  const operations = (result.operations ?? []).map((operation) =>
    operation?.op === "level_evolution" && operation.to === matching.species
      ? { ...operation, method, parameter }
      : operation);
  return { ...result, evolution, levelEvolutionCandidate, operations };
}

function withoutFieldUnsupported(result) {
  return {
    ...result,
    unsupportedMethods: (result?.unsupportedMethods ?? []).filter((method) => !FIELD_CONTEXT_METHODS.has(method)),
  };
}

export function resolvePokemonLevelEvolutionWithFieldContext(runtime, options = {}) {
  const speciesMasters = options?.species_masters;
  if (!speciesMasters || typeof speciesMasters !== "object" || Array.isArray(speciesMasters)) {
    return resolvePokemonLevelEvolutionWithPartyContext(runtime, options);
  }
  const sourceMaster = speciesMasters[runtime?.species];
  const party = options?.party;
  if (!Array.isArray(party)) {
    const base = withoutFieldUnsupported(resolvePokemonLevelEvolutionWithPartyContext(runtime, options));
    if (base?.levelEvolutionCandidate) return base;
    const deferred = deferredFieldCandidate(sourceMaster, runtime);
    return deferred ? { ...base, levelEvolutionCandidate: deferred } : base;
  }
  const resolved = resolvePokemonLevelEvolutionWithPartyContext(runtime, {
    ...options,
    species_masters: adaptedSpeciesMasters(speciesMasters, runtime, options),
  });
  return withoutFieldUnsupported(relabelFieldResult(resolved, sourceMaster, runtime, options));
}
