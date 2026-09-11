import { createPokemonRuntime, recalculatePokemonStats } from "./pokemon-runtime.js";
import { minimumExpForGrowthRateLevelV108 } from "./mapless-evolution-lab-growth-v108.js";

function cloneOperation(operation) {
  return operation && typeof operation === "object" ? structuredClone(operation) : operation;
}

/**
 * Shared commit seam for canonical v0.9.108 Pokémon mutation intents.
 *
 * This module does not own evolution decisions/RNG/species data. It consumes an
 * owner-emitted mutation intent and delegates stat calculation to pokemon-runtime.
 * Callers must hydrate canonical species/nature/growth-rate context; missing context fails closed.
 */
export function commitCanonicalPokemonMutationV108(pokemon, operation, context = {}) {
  const current = createPokemonRuntime(pokemon);
  const intent = cloneOperation(operation);
  if (!intent || typeof intent !== "object") {
    return { success:false, result:"mutation_intent_required", pokemon:current, operation:intent };
  }

  if (intent.op === "force_evolve") {
    return {
      success:false,
      result:"force_evolve_owner_unavailable",
      pokemon:current,
      operation:intent,
    };
  }

  if (intent.op !== "lower_level") {
    return { success:false, result:"unsupported_pokemon_mutation", pokemon:current, operation:intent };
  }

  const levels = Number(intent.levels);
  const minimumLevel = Number(intent.minimum_level ?? 1);
  if (!Number.isInteger(levels) || levels < 0) throw new TypeError("lower_level levels must be a non-negative integer");
  if (!Number.isInteger(minimumLevel) || minimumLevel < 1) throw new TypeError("minimum_level must be a positive integer");
  if (intent.recalculate_stats !== true) {
    return { success:false, result:"lower_level_requires_stat_recalculation", pokemon:current, operation:intent };
  }
  if (!context.base_stats) {
    return { success:false, result:"base_stats_required", pokemon:current, operation:intent };
  }
  if (!context.growth_rate) {
    return { success:false, result:"growth_rate_required", pokemon:current, operation:intent };
  }

  const level = Math.max(minimumLevel, current.level - levels);
  // Essentials Pokemon#level= snaps EXP to the minimum EXP for the assigned level.
  const exp = minimumExpForGrowthRateLevelV108(context.growth_rate, level);
  const lowered = { ...current, level, exp };
  const recalculated = recalculatePokemonStats(lowered, {
    base_stats: context.base_stats,
    nature_stat_changes: context.nature_stat_changes ?? [],
    disable_ivs_and_evs: context.disable_ivs_and_evs === true,
    previous_mapless_bonus_stats: context.previous_mapless_bonus_stats ?? null,
  });
  return {
    success:true,
    result:"level_lowered",
    pokemon:recalculated,
    operation:intent,
    previousLevel:current.level,
    level:recalculated.level,
    previousExp:current.exp,
    exp:recalculated.exp,
  };
}
