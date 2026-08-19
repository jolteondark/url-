import { resolvePokemonRuntimeMasters } from "./pokemon-runtime-masters.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";

function normalizeEvolution(entry) {
  if (Array.isArray(entry)) {
    const [species, method, parameter] = entry;
    return { species: String(species ?? ""), method: String(method ?? ""), parameter };
  }
  if (!entry || typeof entry !== "object") return null;
  return {
    species: String(entry.species ?? entry.target ?? entry.id ?? ""),
    method: String(entry.method ?? entry.type ?? ""),
    parameter: entry.parameter ?? entry.param ?? entry.level,
  };
}

function levelEvolutionTarget(speciesMaster, level) {
  const unsupportedMethods = new Set();
  let eligible = null;
  for (const raw of speciesMaster?.evolutions ?? []) {
    const evolution = normalizeEvolution(raw);
    if (!evolution?.species || !evolution.method) continue;
    if (evolution.method !== "Level") {
      unsupportedMethods.add(evolution.method);
      continue;
    }
    const requiredLevel = Number(evolution.parameter);
    if (!Number.isInteger(requiredLevel) || requiredLevel < 1) continue;
    if (!eligible && level >= requiredLevel) {
      eligible = { target: evolution.species, method: evolution.method, parameter: requiredLevel };
    }
  }
  return {
    target: eligible?.target ?? null,
    method: eligible?.method ?? null,
    parameter: eligible?.parameter ?? null,
    unsupportedMethods: [...unsupportedMethods],
  };
}

export function resolvePokemonLevelEvolution(runtime, {
  species_masters,
  nature_master = null,
  move_masters = {},
  disable_ivs_and_evs = false,
} = {}) {
  if (!species_masters || typeof species_masters !== "object" || Array.isArray(species_masters)) {
    throw new TypeError("species_masters must be an object keyed by species id");
  }
  const sourceMaster = species_masters[runtime?.species];
  if (!sourceMaster) throw new RangeError(`missing species master for ${runtime?.species ?? "unknown species"}`);
  const candidate = levelEvolutionTarget(sourceMaster, Number(runtime.level));
  if (!candidate.target) {
    return {
      pokemon: runtime,
      evolved: false,
      evolution: null,
      unsupportedMethods: candidate.unsupportedMethods,
      operations: [],
    };
  }

  const targetMaster = species_masters[candidate.target];
  if (!targetMaster) throw new RangeError(`missing evolution target species master for ${candidate.target}`);
  const before = structuredClone(runtime);
  const nextForm = Number.isInteger(Number(targetMaster.form)) ? Number(targetMaster.form) : 0;
  const speciesChanged = updatePokemonRuntime(runtime, { species: candidate.target, form: nextForm });
  const recalculated = resolvePokemonRuntimeMasters(speciesChanged, {
    species_master: targetMaster,
    nature_master,
    move_masters,
    disable_ivs_and_evs,
  });

  return {
    pokemon: recalculated,
    evolved: true,
    evolution: { from: before.species, to: candidate.target, method: candidate.method, parameter: candidate.parameter },
    unsupportedMethods: candidate.unsupportedMethods,
    operations: [{
      op: "level_evolution",
      from: before.species,
      to: candidate.target,
      method: candidate.method,
      parameter: candidate.parameter,
      oldMaxHp: before.max_hp ?? null,
      newMaxHp: recalculated.max_hp ?? null,
      oldHp: before.hp ?? null,
      newHp: recalculated.hp ?? null,
    }],
  };
}
