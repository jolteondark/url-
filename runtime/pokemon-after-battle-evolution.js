import { resolvePokemonLevelEvolution } from "./pokemon-level-evolution-runtime.js";

const BATTLE_CRITICAL_HIT_SENTINEL = -2147483600;
const AFTER_BATTLE_METHOD = "BattleDealCriticalHit";

function normalizeEvolution(entry) {
  if (Array.isArray(entry)) {
    const [species, method, parameter, prevolution = false] = entry;
    return {
      species: String(species ?? ""),
      method: String(method ?? ""),
      parameter,
      prevolution: prevolution === true,
    };
  }
  if (!entry || typeof entry !== "object") return null;
  return {
    species: String(entry.species ?? entry.target ?? entry.id ?? ""),
    method: String(entry.method ?? entry.type ?? ""),
    parameter: entry.parameter ?? entry.param ?? entry.level,
    prevolution: (entry.prevolution ?? entry.is_prevolution ?? entry.prevo) === true,
  };
}

function criticalEvolutionEntries(speciesMaster) {
  const entries = [];
  for (const raw of speciesMaster?.evolutions ?? []) {
    const evolution = normalizeEvolution(raw);
    if (!evolution?.species || evolution.prevolution || evolution.method !== AFTER_BATTLE_METHOD) continue;
    const required = Number(evolution.parameter);
    if (!Number.isInteger(required) || required < 1) continue;
    entries.push({ ...evolution, parameter: required });
  }
  return entries;
}

function publicCandidate(entry) {
  if (!entry) return null;
  return { to: entry.species, method: AFTER_BATTLE_METHOD, parameter: entry.parameter };
}

function syntheticEvolution(entry) {
  return [entry.species, "Level", BATTLE_CRITICAL_HIT_SENTINEL, false];
}

function adaptedSpeciesMasters(speciesMasters, runtime, eligible) {
  const adapted = {};
  for (const [id, master] of Object.entries(speciesMasters ?? {})) {
    if (id !== runtime?.species) {
      adapted[id] = master;
      continue;
    }
    adapted[id] = {
      ...master,
      // This owner is check_evolution_after_battle, not a second generic
      // level-up pass. Keep only the satisfied after-battle trigger so another
      // level-up method cannot accidentally fire here.
      evolutions: eligible ? [syntheticEvolution(eligible)] : [],
    };
  }
  return adapted;
}

function relabelResult(result, eligible) {
  if (!result?.evolved || !eligible || result?.evolution?.method !== "Level") return result;
  if (Number(result?.evolution?.parameter) !== BATTLE_CRITICAL_HIT_SENTINEL) return result;
  const evolution = {
    ...result.evolution,
    method: AFTER_BATTLE_METHOD,
    parameter: eligible.parameter,
  };
  const levelEvolutionCandidate = result.levelEvolutionCandidate
    ? {
        ...result.levelEvolutionCandidate,
        method: AFTER_BATTLE_METHOD,
        parameter: eligible.parameter,
      }
    : null;
  const operations = (result.operations ?? []).map((operation) =>
    operation?.op === "level_evolution" && operation.to === eligible.species
      ? {
          ...operation,
          method: AFTER_BATTLE_METHOD,
          parameter: eligible.parameter,
        }
      : operation
  );
  return {
    ...result,
    evolution,
    levelEvolutionCandidate,
    operations,
  };
}

export function resolvePokemonAfterBattleEvolution(runtime, {
  species_masters,
  critical_hits_dealt = 0,
  ...options
} = {}) {
  if (!species_masters || typeof species_masters !== "object" || Array.isArray(species_masters)) {
    throw new TypeError("species_masters must be an object keyed by species id");
  }
  const sourceMaster = species_masters[runtime?.species];
  if (!sourceMaster) throw new RangeError(`missing species master for ${runtime?.species ?? "unknown species"}`);

  const entries = criticalEvolutionEntries(sourceMaster);
  const count = Math.max(0, Math.trunc(Number(critical_hits_dealt) || 0));
  const eligible = entries.find((entry) => count >= entry.parameter) ?? null;
  const candidate = entries[0] ?? null;

  if (!eligible) {
    return {
      pokemon: runtime,
      evolved: false,
      evolution: null,
      afterBattleEvolutionCandidate: publicCandidate(candidate),
      evolutionBlockedBy: null,
      unsupportedMethods: [],
      operations: [],
    };
  }

  const resolved = resolvePokemonLevelEvolution(runtime, {
    ...options,
    species_masters: adaptedSpeciesMasters(species_masters, runtime, eligible),
  });
  const relabeled = relabelResult(resolved, eligible);
  return {
    ...relabeled,
    afterBattleEvolutionCandidate: publicCandidate(eligible),
    unsupportedMethods: (relabeled.unsupportedMethods ?? []).filter((method) => method !== AFTER_BATTLE_METHOD),
  };
}
