import { resolvePokemonLevelEvolution as resolveBasePokemonLevelEvolution } from "./pokemon-level-evolution-runtime.js";

const HAS_IN_PARTY_LEVEL_SENTINEL = -2147483648;
const LEVEL_DARK_IN_PARTY_SENTINEL = -2147483647;
const LEVEL_DAY_SENTINEL = -2147483646;
const LEVEL_NIGHT_SENTINEL = -2147483645;
const LEVEL_MORNING_SENTINEL = -2147483644;
const LEVEL_AFTERNOON_SENTINEL = -2147483643;
const LEVEL_EVENING_SENTINEL = -2147483642;

const PARTY_CONTEXT_METHODS = new Set(["HasInParty", "LevelDarkInParty"]);
const TIME_CONTEXT_METHODS = new Set(["LevelDay", "LevelNight", "LevelMorning", "LevelAfternoon", "LevelEvening"]);
const CONTEXT_METHODS = new Set([...PARTY_CONTEXT_METHODS, ...TIME_CONTEXT_METHODS]);

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

function normalizedDataId(value) {
  return String(value ?? "").replace(/^:/, "");
}

function normalizedTypes(master) {
  return Array.isArray(master?.types) ? master.types.map(normalizedDataId) : [];
}

function partyHasSpecies(party, species) {
  const required = normalizedDataId(species);
  if (!required || !Array.isArray(party)) return false;
  return party.some((pokemon) => normalizedDataId(pokemon?.species) === required);
}

function partyHasType(party, type, speciesMasters) {
  const required = normalizedDataId(type);
  if (!required || !Array.isArray(party)) return false;
  return party.some((pokemon) => {
    const runtimeTypes = Array.isArray(pokemon?.types) ? pokemon.types.map(normalizedDataId) : [];
    if (runtimeTypes.includes(required)) return true;
    const master = speciesMasters?.[normalizedDataId(pokemon?.species)];
    return normalizedTypes(master).includes(required);
  });
}

function canonicalHour(value) {
  const explicit = Number(value);
  if (Number.isInteger(explicit) && explicit >= 0 && explicit < 24) return explicit;
  return new Date().getHours();
}

function timeContextSatisfied(method, hour) {
  if (method === "LevelDay") return hour >= 5 && hour < 20;
  if (method === "LevelNight") return hour >= 20 || hour < 5;
  if (method === "LevelMorning") return hour >= 5 && hour < 10;
  if (method === "LevelAfternoon") return hour >= 14 && hour < 17;
  if (method === "LevelEvening") return hour >= 17 && hour < 20;
  return false;
}

function contextualEntries(speciesMaster) {
  const entries = [];
  for (const raw of speciesMaster?.evolutions ?? []) {
    const evolution = normalizeEvolution(raw);
    if (!evolution?.species || evolution.prevolution || !CONTEXT_METHODS.has(evolution.method)) continue;
    entries.push(evolution);
  }
  return entries;
}

function contextSatisfied(evolution, runtime, party, speciesMasters, hour) {
  if (evolution.method === "HasInParty") return partyHasSpecies(party, evolution.parameter);
  if (evolution.method === "LevelDarkInParty") {
    return Number(runtime?.level) >= Number(evolution.parameter)
      && partyHasType(party, "DARK", speciesMasters);
  }
  if (TIME_CONTEXT_METHODS.has(evolution.method)) {
    return Number(runtime?.level) >= Number(evolution.parameter)
      && timeContextSatisfied(evolution.method, hour);
  }
  return false;
}

function sentinelForMethod(method) {
  if (method === "HasInParty") return HAS_IN_PARTY_LEVEL_SENTINEL;
  if (method === "LevelDarkInParty") return LEVEL_DARK_IN_PARTY_SENTINEL;
  if (method === "LevelDay") return LEVEL_DAY_SENTINEL;
  if (method === "LevelNight") return LEVEL_NIGHT_SENTINEL;
  if (method === "LevelMorning") return LEVEL_MORNING_SENTINEL;
  if (method === "LevelAfternoon") return LEVEL_AFTERNOON_SENTINEL;
  return LEVEL_EVENING_SENTINEL;
}

function methodForSentinel(parameter) {
  if (parameter === HAS_IN_PARTY_LEVEL_SENTINEL) return "HasInParty";
  if (parameter === LEVEL_DARK_IN_PARTY_SENTINEL) return "LevelDarkInParty";
  if (parameter === LEVEL_DAY_SENTINEL) return "LevelDay";
  if (parameter === LEVEL_NIGHT_SENTINEL) return "LevelNight";
  if (parameter === LEVEL_MORNING_SENTINEL) return "LevelMorning";
  if (parameter === LEVEL_AFTERNOON_SENTINEL) return "LevelAfternoon";
  if (parameter === LEVEL_EVENING_SENTINEL) return "LevelEvening";
  return null;
}

function adaptEvolutionEntry(raw, runtime, party, speciesMasters, hour) {
  const evolution = normalizeEvolution(raw);
  if (!evolution || evolution.prevolution || !CONTEXT_METHODS.has(evolution.method)) return structuredClone(raw);
  if (!contextSatisfied(evolution, runtime, party, speciesMasters, hour)) return null;
  // The base owner already owns all species/form/stats/HP/move-learning continuity.
  // Convert only a satisfied external-context trigger to an unmistakable always-eligible
  // Level sentinel, then relabel the public result back to the canonical method.
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

function contextualSpeciesMasters(speciesMasters, runtime, party, hour) {
  const adapted = {};
  for (const [id, master] of Object.entries(speciesMasters ?? {})) {
    const evolutions = [];
    for (const raw of master?.evolutions ?? []) {
      const next = id === runtime?.species
        ? adaptEvolutionEntry(raw, runtime, party, speciesMasters, hour)
        : structuredClone(raw);
      if (next != null) evolutions.push(next);
    }
    adapted[id] = { ...master, evolutions };
  }
  return adapted;
}

function matchingContextEntry(result, sourceMaster, runtime, party, speciesMasters, hour) {
  if (!result?.evolved || result?.evolution?.method !== "Level") return null;
  const method = methodForSentinel(Number(result?.evolution?.parameter));
  if (!method) return null;
  return contextualEntries(sourceMaster).find((entry) =>
    entry.method === method
      && entry.species === result.evolution.to
      && contextSatisfied(entry, runtime, party, speciesMasters, hour)) ?? null;
}

function publicParameter(entry) {
  return entry.method === "HasInParty" ? normalizedDataId(entry.parameter) : Number(entry.parameter);
}

function relabelContextualResult(result, sourceMaster, runtime, party, speciesMasters, hour) {
  const matching = matchingContextEntry(result, sourceMaster, runtime, party, speciesMasters, hour);
  if (!matching) return result;

  const parameter = publicParameter(matching);
  const evolution = { ...result.evolution, method: matching.method, parameter };
  const levelEvolutionCandidate = result.levelEvolutionCandidate
    ? { ...result.levelEvolutionCandidate, method: matching.method, parameter }
    : null;
  const operations = (result.operations ?? []).map((operation) =>
    operation?.op === "level_evolution" && operation.to === matching.species
      ? { ...operation, method: matching.method, parameter }
      : operation);
  return { ...result, evolution, levelEvolutionCandidate, operations };
}

function deferredContextCandidate(sourceMaster, runtime) {
  for (const entry of contextualEntries(sourceMaster)) {
    if (entry.method !== "HasInParty" && Number(runtime?.level) < Number(entry.parameter)) continue;
    return {
      to: entry.species,
      method: entry.method,
      parameter: publicParameter(entry),
    };
  }
  return null;
}

export function resolvePokemonLevelEvolutionWithPartyContext(runtime, options = {}) {
  const speciesMasters = options?.species_masters;
  if (!speciesMasters || typeof speciesMasters !== "object" || Array.isArray(speciesMasters)) {
    return resolveBasePokemonLevelEvolution(runtime, options);
  }
  const sourceMaster = speciesMasters[runtime?.species];
  const party = options?.party;

  if (!Array.isArray(party)) {
    const base = resolveBasePokemonLevelEvolution(runtime, options);
    if (base?.levelEvolutionCandidate) return base;
    const deferred = deferredContextCandidate(sourceMaster, runtime);
    if (!deferred) return base;
    // Battle EXP eligibility probing remembers only that a canonical level-up
    // trigger needs external context. Terminal REWARD_GROWTH re-runs the actual
    // party/time predicate and may still reject the evolution.
    return { ...base, levelEvolutionCandidate: deferred };
  }

  const hour = canonicalHour(options?.time_hour);
  const adaptedMasters = contextualSpeciesMasters(speciesMasters, runtime, party, hour);
  const resolved = resolveBasePokemonLevelEvolution(runtime, {
    ...options,
    species_masters: adaptedMasters,
  });
  const relabeled = relabelContextualResult(resolved, sourceMaster, runtime, party, speciesMasters, hour);
  return {
    ...relabeled,
    unsupportedMethods: (relabeled.unsupportedMethods ?? []).filter((method) => !CONTEXT_METHODS.has(method)),
  };
}
