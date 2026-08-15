import {
  createPokemonRuntime,
  materializePokemonMoveRuntime,
  recalculatePokemonStats,
} from "./pokemon-runtime.js";

function pokemonMoveId(move) {
  return typeof move === "string" ? move : move.id;
}

function requireMatchingMaster(master, id, label) {
  if (!master || typeof master !== "object" || Array.isArray(master)) {
    throw new TypeError(`${label} master is required`);
  }
  if (master.id !== id) throw new TypeError(`${label} master id must match ${id}`);
  return master;
}

function requireMoveMaster(moveMasters, moveId) {
  if (!moveMasters || typeof moveMasters !== "object" || Array.isArray(moveMasters)) {
    throw new TypeError("move_masters must be an object keyed by move id");
  }
  return requireMatchingMaster(moveMasters[moveId], moveId, "move");
}

/**
 * Resolve one persistent Pokemon instance against already-projected Game Data.
 *
 * The caller owns all master lookups. This module deliberately does not import
 * PBS/Game Data so the dependency direction stays Game Data -> Pokemon Runtime.
 * Individual state (HP, IV/EV, PP Ups/current PP, held item, status, etc.) stays
 * on the returned Pokemon Runtime object; masters only provide calculation data.
 */
export function resolvePokemonRuntimeMasters(runtime, {
  species_master,
  nature_master = null,
  move_masters = {},
  disable_ivs_and_evs = false,
} = {}) {
  let current = createPokemonRuntime(runtime);
  const speciesMaster = requireMatchingMaster(species_master, current.species, "species");

  const statsNatureId = current.nature_for_stats_id ?? current.nature_id;
  let natureStatChanges = [];
  if (statsNatureId !== null) {
    const natureMaster = requireMatchingMaster(nature_master, statsNatureId, "nature");
    if (!Array.isArray(natureMaster.stat_changes)) throw new TypeError("nature master stat_changes must be an array");
    natureStatChanges = natureMaster.stat_changes;
  } else if (nature_master !== null) {
    throw new TypeError("nature master provided for Pokemon without a stats nature reference");
  }

  const moves = current.moves.map((move) => {
    const moveId = pokemonMoveId(move);
    const moveMaster = requireMoveMaster(move_masters, moveId);
    return materializePokemonMoveRuntime(move, moveMaster.total_pp);
  });

  current = createPokemonRuntime({ ...current, moves });
  return recalculatePokemonStats(current, {
    base_stats: speciesMaster.base_stats,
    nature_stat_changes: natureStatChanges,
    disable_ivs_and_evs,
  });
}
