import { resolvePokemonLevelEvolution as resolveBasePokemonLevelEvolution } from "./pokemon-level-evolution-runtime.js";

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

function partyHasSpecies(party, species) {
  const required = normalizedDataId(species);
  if (!required || !Array.isArray(party)) return false;
  return party.some((pokemon) => normalizedDataId(pokemon?.species) === required);
}

function hasInPartyEntries(speciesMaster) {
  const entries = [];
  for (const raw of speciesMaster?.evolutions ?? []) {
    const evolution = normalizeEvolution(raw);
    if (!evolution?.species || evolution.prevolution || evolution.method !== "HasInParty") continue;
    entries.push(evolution);
  }
  return entries;
}

function adaptEvolutionEntry(raw, runtime, party) {
  const evolution = normalizeEvolution(raw);
  if (!evolution || evolution.prevolution || evolution.method !== "HasInParty") return structuredClone(raw);
  if (!partyHasSpecies(party, evolution.parameter)) return null;
  // The base owner already owns all species/form/stats/HP/move-learning continuity.
  // Convert only the satisfied level-up trigger to an always-eligible level check,
  // then relabel the public result back to the canonical HasInParty method.
  if (Array.isArray(raw)) return [evolution.species, "Level", Math.max(1, Number(runtime?.level) || 1), evolution.prevolution];
  return {
    ...structuredClone(raw),
    method: "Level",
    type: Object.prototype.hasOwnProperty.call(raw, "type") ? "Level" : raw.type,
    parameter: Math.max(1, Number(runtime?.level) || 1),
    param: Object.prototype.hasOwnProperty.call(raw, "param") ? Math.max(1, Number(runtime?.level) || 1) : raw.param,
    level: Object.prototype.hasOwnProperty.call(raw, "level") ? Math.max(1, Number(runtime?.level) || 1) : raw.level,
  };
}

function contextualSpeciesMasters(speciesMasters, runtime, party) {
  const adapted = {};
  for (const [id, master] of Object.entries(speciesMasters ?? {})) {
    const evolutions = [];
    for (const raw of master?.evolutions ?? []) {
      const next = adaptEvolutionEntry(raw, runtime, party);
      if (next != null) evolutions.push(next);
    }
    adapted[id] = { ...master, evolutions };
  }
  return adapted;
}

function relabelHasInPartyResult(result, sourceMaster, party) {
  if (!result?.evolved || result?.evolution?.method !== "Level") return result;
  const matching = hasInPartyEntries(sourceMaster).find((entry) =>
    entry.species === result.evolution.to && partyHasSpecies(party, entry.parameter));
  if (!matching) return result;

  const evolution = { ...result.evolution, method: "HasInParty", parameter: normalizedDataId(matching.parameter) };
  const levelEvolutionCandidate = result.levelEvolutionCandidate
    ? { ...result.levelEvolutionCandidate, method: "HasInParty", parameter: normalizedDataId(matching.parameter) }
    : null;
  const operations = (result.operations ?? []).map((operation) =>
    operation?.op === "level_evolution" && operation.to === matching.species
      ? { ...operation, method: "HasInParty", parameter: normalizedDataId(matching.parameter) }
      : operation);
  return { ...result, evolution, levelEvolutionCandidate, operations };
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
    const deferred = hasInPartyEntries(sourceMaster)[0] ?? null;
    if (!deferred) return base;
    // Battle EXP eligibility probing can safely remember that this canonical
    // level-up trigger needs party context. The terminal REWARD_GROWTH owner
    // re-runs the check with the actual party and may still reject it.
    return {
      ...base,
      levelEvolutionCandidate: {
        to: deferred.species,
        method: "HasInParty",
        parameter: normalizedDataId(deferred.parameter),
      },
    };
  }

  const adaptedMasters = contextualSpeciesMasters(speciesMasters, runtime, party);
  const resolved = resolveBasePokemonLevelEvolution(runtime, {
    ...options,
    species_masters: adaptedMasters,
  });
  const relabeled = relabelHasInPartyResult(resolved, sourceMaster, party);
  return {
    ...relabeled,
    unsupportedMethods: (relabeled.unsupportedMethods ?? []).filter((method) => method !== "HasInParty"),
  };
}
