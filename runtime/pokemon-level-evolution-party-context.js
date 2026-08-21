import { resolvePokemonLevelEvolution as resolveBasePokemonLevelEvolution } from "./pokemon-level-evolution-runtime.js";

const HAS_IN_PARTY_LEVEL_SENTINEL = -2147483648;
const LEVEL_DARK_IN_PARTY_SENTINEL = -2147483647;
const PARTY_CONTEXT_METHODS = new Set(["HasInParty", "LevelDarkInParty"]);

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

function contextualEntries(speciesMaster) {
  const entries = [];
  for (const raw of speciesMaster?.evolutions ?? []) {
    const evolution = normalizeEvolution(raw);
    if (!evolution?.species || evolution.prevolution || !PARTY_CONTEXT_METHODS.has(evolution.method)) continue;
    entries.push(evolution);
  }
  return entries;
}

function contextSatisfied(evolution, runtime, party, speciesMasters) {
  if (evolution.method === "HasInParty") return partyHasSpecies(party, evolution.parameter);
  if (evolution.method === "LevelDarkInParty") {
    return Number(runtime?.level) >= Number(evolution.parameter)
      && partyHasType(party, "DARK", speciesMasters);
  }
  return false;
}

function sentinelForMethod(method) {
  return method === "HasInParty" ? HAS_IN_PARTY_LEVEL_SENTINEL : LEVEL_DARK_IN_PARTY_SENTINEL;
}

function adaptEvolutionEntry(raw, runtime, party, speciesMasters) {
  const evolution = normalizeEvolution(raw);
  if (!evolution || evolution.prevolution || !PARTY_CONTEXT_METHODS.has(evolution.method)) return structuredClone(raw);
  if (!contextSatisfied(evolution, runtime, party, speciesMasters)) return null;
  // The base owner already owns all species/form/stats/HP/move-learning continuity.
  // Convert only a satisfied party-context trigger to an unmistakable always-eligible
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

function contextualSpeciesMasters(speciesMasters, runtime, party) {
  const adapted = {};
  for (const [id, master] of Object.entries(speciesMasters ?? {})) {
    const evolutions = [];
    for (const raw of master?.evolutions ?? []) {
      const next = id === runtime?.species
        ? adaptEvolutionEntry(raw, runtime, party, speciesMasters)
        : structuredClone(raw);
      if (next != null) evolutions.push(next);
    }
    adapted[id] = { ...master, evolutions };
  }
  return adapted;
}

function matchingContextEntry(result, sourceMaster, runtime, party, speciesMasters) {
  if (!result?.evolved || result?.evolution?.method !== "Level") return null;
  const parameter = Number(result?.evolution?.parameter);
  const method = parameter === HAS_IN_PARTY_LEVEL_SENTINEL
    ? "HasInParty"
    : parameter === LEVEL_DARK_IN_PARTY_SENTINEL
      ? "LevelDarkInParty"
      : null;
  if (!method) return null;
  return contextualEntries(sourceMaster).find((entry) =>
    entry.method === method
      && entry.species === result.evolution.to
      && contextSatisfied(entry, runtime, party, speciesMasters)) ?? null;
}

function publicParameter(entry) {
  return entry.method === "HasInParty" ? normalizedDataId(entry.parameter) : Number(entry.parameter);
}

function relabelContextualResult(result, sourceMaster, runtime, party, speciesMasters) {
  const matching = matchingContextEntry(result, sourceMaster, runtime, party, speciesMasters);
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
    if (entry.method === "LevelDarkInParty" && Number(runtime?.level) < Number(entry.parameter)) continue;
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
    // trigger needs party context. Terminal REWARD_GROWTH re-runs the actual
    // party predicate and may still reject the evolution.
    return { ...base, levelEvolutionCandidate: deferred };
  }

  const adaptedMasters = contextualSpeciesMasters(speciesMasters, runtime, party);
  const resolved = resolveBasePokemonLevelEvolution(runtime, {
    ...options,
    species_masters: adaptedMasters,
  });
  const relabeled = relabelContextualResult(resolved, sourceMaster, runtime, party, speciesMasters);
  return {
    ...relabeled,
    unsupportedMethods: (relabeled.unsupportedMethods ?? []).filter((method) => !PARTY_CONTEXT_METHODS.has(method)),
  };
}
