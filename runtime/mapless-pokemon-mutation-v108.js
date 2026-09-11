import { createPokemonRuntime, recalculatePokemonStats } from "./pokemon-runtime.js";
import { minimumExpForGrowthRateLevelV108 } from "./mapless-evolution-lab-growth-v108.js";

function cloneOperation(operation) {
  return operation && typeof operation === "object" ? structuredClone(operation) : operation;
}

function levelFromExp(growthRate, exp, maxLevel = 100) {
  const points = Number(exp);
  if (!Number.isInteger(points) || points < 0) throw new TypeError("exp must be a non-negative integer");
  let level = 1;
  for (let candidate = 2; candidate <= maxLevel; candidate += 1) {
    if (minimumExpForGrowthRateLevelV108(growthRate, candidate) > points) break;
    level = candidate;
  }
  return level;
}

/**
 * Shared commit seam for canonical v0.9.108 Pokémon mutation intents.
 *
 * This module does not own Evolution Lab decisions/RNG/species selection. It consumes
 * owner-emitted mutation intents and canonical hydrated target/stat context. Safari must
 * not reimplement the mutation. Evolution contexts with canonical after-evolution side
 * effects require an explicit owner-ready signal before this single-Pokémon commit runs.
 */
export function commitCanonicalPokemonMutationV108(pokemon, operation, context = {}) {
  const current = createPokemonRuntime(pokemon);
  const intent = cloneOperation(operation);
  if (!intent || typeof intent !== "object") {
    return { success:false, result:"mutation_intent_required", pokemon:current, operation:intent };
  }

  if (intent.op === "force_evolve") {
    const target = String(intent.species ?? "");
    if (!target) return { success:false, result:"evolution_target_required", pokemon:current, operation:intent };
    if (context.success !== true || context.target !== target || context.source !== current.species) {
      return { success:false, result:"force_evolution_context_required", pokemon:current, operation:intent };
    }
    if (!context.base_stats || !context.growth_rate || !Array.isArray(context.nature_stat_changes)) {
      return { success:false, result:"force_evolution_stat_context_required", pokemon:current, operation:intent };
    }
    if (context.after_evolution_effect === true && context.after_evolution_effect_owner_ready !== true) {
      return { success:false, result:"evolution_after_effect_owner_required", pokemon:current, operation:intent };
    }
    if (current.exp == null) {
      return { success:false, result:"evolution_exp_required", pokemon:current, operation:intent };
    }

    // Essentials v21.1 Pokemon#species= invalidates cached level because a target species
    // may use a different growth rate. EXP itself is preserved, so derive the target level
    // from that EXP before calc_stats. Mapless force_evolve restores pre-evolution moves
    // after PokemonEvolutionScene, therefore move objects/PP are kept verbatim here.
    const level = levelFromExp(context.growth_rate, current.exp);
    const wasFainted = current.hp === 0;
    const evolvedBase = createPokemonRuntime({
      ...current,
      species:target,
      form:Number(context.target_form ?? 0),
      forced_form:null,
      gender:context.gender ?? current.gender,
      ability_id:context.ability_id ?? null,
      level,
      ready_to_evolve:false,
      moves:structuredClone(current.moves),
    });
    let evolved = recalculatePokemonStats(evolvedBase, {
      base_stats:context.base_stats,
      nature_stat_changes:context.nature_stat_changes,
      disable_ivs_and_evs:context.disable_ivs_and_evs === true,
      previous_mapless_bonus_stats:context.previous_mapless_bonus_stats ?? null,
    });
    if (wasFainted) evolved = createPokemonRuntime({ ...evolved, hp:0 });
    return {
      success:true,
      result:"pokemon_evolved",
      pokemon:evolved,
      operation:intent,
      previousSpecies:current.species,
      species:evolved.species,
      previousForm:current.form,
      form:evolved.form,
      previousLevel:current.level,
      level:evolved.level,
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
