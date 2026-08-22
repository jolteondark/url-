import { resolvePokemonLevelEvolution } from "./pokemon-level-evolution-runtime.js";

const BATTLE_CRITICAL_HIT_SENTINEL = -2147483600;
const CRITICAL_AFTER_BATTLE_METHOD = "BattleDealCriticalHit";
const DAMAGE_EVENT_METHOD = "EventAfterDamageTaken";
const DAMAGE_READY_THRESHOLD = 49;

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

function evolutionEntries(speciesMaster, method) {
  const entries = [];
  for (const raw of speciesMaster?.evolutions ?? []) {
    const evolution = normalizeEvolution(raw);
    if (!evolution?.species || evolution.prevolution || evolution.method !== method) continue;
    const required = Number(evolution.parameter);
    if (!Number.isInteger(required) || required < 1) continue;
    entries.push({ ...evolution, parameter: required });
  }
  return entries;
}

function publicCandidate(entry, method) {
  if (!entry) return null;
  return { to: entry.species, method, parameter: entry.parameter };
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
    method: CRITICAL_AFTER_BATTLE_METHOD,
    parameter: eligible.parameter,
  };
  const levelEvolutionCandidate = result.levelEvolutionCandidate
    ? {
        ...result.levelEvolutionCandidate,
        method: CRITICAL_AFTER_BATTLE_METHOD,
        parameter: eligible.parameter,
      }
    : null;
  const operations = (result.operations ?? []).map((operation) =>
    operation?.op === "level_evolution" && operation.to === eligible.species
      ? {
          ...operation,
          method: CRITICAL_AFTER_BATTLE_METHOD,
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

function applyDamageEventReadyState(runtime, sourceMaster, directDamageTaken) {
  const entries = evolutionEntries(sourceMaster, DAMAGE_EVENT_METHOD);
  const candidate = entries[0] ?? null;
  const damage = Math.max(0, Math.trunc(Number(directDamageTaken) || 0));
  if (!candidate || damage < DAMAGE_READY_THRESHOLD) {
    return {
      pokemon: runtime,
      candidate: publicCandidate(candidate, DAMAGE_EVENT_METHOD),
      operation: null,
    };
  }
  if (runtime?.ready_to_evolve === true) {
    return {
      pokemon: runtime,
      candidate: publicCandidate(candidate, DAMAGE_EVENT_METHOD),
      operation: null,
    };
  }
  return {
    pokemon: { ...runtime, ready_to_evolve: true },
    candidate: publicCandidate(candidate, DAMAGE_EVENT_METHOD),
    operation: {
      op: "set_ready_to_evolve",
      method: DAMAGE_EVENT_METHOD,
      value: true,
      directDamageTaken: damage,
      threshold: DAMAGE_READY_THRESHOLD,
    },
  };
}

export function resolvePokemonAfterBattleEvolution(runtime, {
  species_masters,
  critical_hits_dealt = 0,
  direct_damage_taken = 0,
  ...options
} = {}) {
  if (!species_masters || typeof species_masters !== "object" || Array.isArray(species_masters)) {
    throw new TypeError("species_masters must be an object keyed by species id");
  }
  const sourceMaster = species_masters[runtime?.species];
  if (!sourceMaster) throw new RangeError(`missing species master for ${runtime?.species ?? "unknown species"}`);

  // v21.1 EventAfterDamageTaken is an after-battle side effect, not an immediate
  // evolution. Reaching 49 direct HP damage only arms ready_to_evolve; the later
  // event trigger still owns the actual species change.
  const damageReady = applyDamageEventReadyState(runtime, sourceMaster, direct_damage_taken);
  const preparedRuntime = damageReady.pokemon;

  const entries = evolutionEntries(sourceMaster, CRITICAL_AFTER_BATTLE_METHOD);
  const count = Math.max(0, Math.trunc(Number(critical_hits_dealt) || 0));
  const eligible = entries.find((entry) => count >= entry.parameter) ?? null;
  const candidate = entries[0] ?? null;

  if (!eligible) {
    return {
      pokemon: preparedRuntime,
      evolved: false,
      evolution: null,
      afterBattleEvolutionCandidate: publicCandidate(candidate, CRITICAL_AFTER_BATTLE_METHOD),
      deferredEventEvolutionCandidate: damageReady.candidate,
      evolutionBlockedBy: null,
      unsupportedMethods: damageReady.candidate ? [DAMAGE_EVENT_METHOD] : [],
      operations: damageReady.operation ? [damageReady.operation] : [],
    };
  }

  const resolved = resolvePokemonLevelEvolution(preparedRuntime, {
    ...options,
    species_masters: adaptedSpeciesMasters(species_masters, preparedRuntime, eligible),
  });
  const relabeled = relabelResult(resolved, eligible);
  return {
    ...relabeled,
    afterBattleEvolutionCandidate: publicCandidate(eligible, CRITICAL_AFTER_BATTLE_METHOD),
    deferredEventEvolutionCandidate: damageReady.candidate,
    unsupportedMethods: [
      ...(relabeled.unsupportedMethods ?? []).filter((method) => method !== CRITICAL_AFTER_BATTLE_METHOD),
      ...(damageReady.candidate ? [DAMAGE_EVENT_METHOD] : []),
    ],
    operations: [
      ...(damageReady.operation ? [damageReady.operation] : []),
      ...(relabeled.operations ?? []),
    ],
  };
}
