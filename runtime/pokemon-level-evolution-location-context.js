import { resolvePokemonLevelEvolutionWithFieldContext } from "./pokemon-level-evolution-field-context.js";

const LOCATION_SENTINEL = -2147483630;
const LOCATION_FLAG_SENTINEL = -2147483629;
const REGION_SENTINEL = -2147483628;

const LOCATION_CONTEXT_METHODS = new Set(["Location", "LocationFlag", "Region"]);

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

function normalizedId(value) {
  return String(value ?? "").trim();
}

function integerId(value) {
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

function explicitFlags(options = {}) {
  const flags = options?.map_flags ?? options?.mapFlags ?? options?.location_flags ?? options?.locationFlags;
  return Array.isArray(flags) ? flags.map(normalizedId).filter(Boolean) : [];
}

function locationContextSatisfied(method, parameter, options = {}) {
  if (method === "Location") {
    const current = integerId(options?.map_id ?? options?.mapId ?? options?.location_id ?? options?.locationId);
    const expected = integerId(parameter);
    return current != null && expected != null && current === expected;
  }
  if (method === "LocationFlag") {
    const expected = normalizedId(parameter);
    return Boolean(expected) && explicitFlags(options).includes(expected);
  }
  if (method === "Region") {
    const current = integerId(options?.region_id ?? options?.regionId);
    const expected = integerId(parameter);
    return current != null && expected != null && current === expected;
  }
  return false;
}

function sentinelForMethod(method) {
  if (method === "Location") return LOCATION_SENTINEL;
  if (method === "LocationFlag") return LOCATION_FLAG_SENTINEL;
  return REGION_SENTINEL;
}

function methodForSentinel(parameter) {
  if (parameter === LOCATION_SENTINEL) return "Location";
  if (parameter === LOCATION_FLAG_SENTINEL) return "LocationFlag";
  if (parameter === REGION_SENTINEL) return "Region";
  return null;
}

function adaptEvolutionEntry(raw, options) {
  const evolution = normalizeEvolution(raw);
  if (!evolution || evolution.prevolution || !LOCATION_CONTEXT_METHODS.has(evolution.method)) return structuredClone(raw);
  if (!locationContextSatisfied(evolution.method, evolution.parameter, options)) return null;
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
      const next = adaptEvolutionEntry(raw, options);
      if (next != null) evolutions.push(next);
    }
    adapted[id] = { ...master, evolutions };
  }
  return adapted;
}

function deferredLocationCandidate(sourceMaster) {
  for (const raw of sourceMaster?.evolutions ?? []) {
    const evolution = normalizeEvolution(raw);
    if (!evolution?.species || evolution.prevolution || !LOCATION_CONTEXT_METHODS.has(evolution.method)) continue;
    return { to: evolution.species, method: evolution.method, parameter: evolution.parameter };
  }
  return null;
}

function relabelLocationResult(result, sourceMaster, options) {
  if (!result?.evolved || result?.evolution?.method !== "Level") return result;
  const method = methodForSentinel(Number(result?.evolution?.parameter));
  if (!method) return result;
  const matching = (sourceMaster?.evolutions ?? []).map(normalizeEvolution).find((entry) =>
    entry?.species === result.evolution.to
      && entry.method === method
      && !entry.prevolution
      && locationContextSatisfied(method, entry.parameter, options));
  if (!matching) return result;
  const parameter = matching.parameter;
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

function withoutLocationUnsupported(result) {
  return {
    ...result,
    unsupportedMethods: (result?.unsupportedMethods ?? []).filter((method) => !LOCATION_CONTEXT_METHODS.has(method)),
  };
}

export function resolvePokemonLevelEvolutionWithLocationContext(runtime, options = {}) {
  const speciesMasters = options?.species_masters;
  if (!speciesMasters || typeof speciesMasters !== "object" || Array.isArray(speciesMasters)) {
    return resolvePokemonLevelEvolutionWithFieldContext(runtime, options);
  }
  const sourceMaster = speciesMasters[runtime?.species];
  const party = options?.party;
  if (!Array.isArray(party)) {
    const base = withoutLocationUnsupported(resolvePokemonLevelEvolutionWithFieldContext(runtime, options));
    if (base?.levelEvolutionCandidate) return base;
    const deferred = deferredLocationCandidate(sourceMaster);
    return deferred ? { ...base, levelEvolutionCandidate: deferred } : base;
  }
  const resolved = resolvePokemonLevelEvolutionWithFieldContext(runtime, {
    ...options,
    species_masters: adaptedSpeciesMasters(speciesMasters, runtime, options),
  });
  return withoutLocationUnsupported(relabelLocationResult(resolved, sourceMaster, options));
}
