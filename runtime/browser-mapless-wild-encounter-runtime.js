import { buildWildEncounterIntegrationPlan } from "./mapless-wild-encounter-integration.js";

function requireGeneratedEncounter(generated) {
  if (!generated || typeof generated !== "object" || Array.isArray(generated)) {
    throw new TypeError("generated encounter projection is required");
  }
  for (const key of ["required_type", "species_id", "species_name"]) {
    if (typeof generated[key] !== "string" || generated[key].length === 0) {
      throw new TypeError(`generated.${key} is required`);
    }
  }
  if (!Number.isInteger(generated.base_level)) {
    throw new TypeError("generated.base_level must be an integer");
  }
  if (!Array.isArray(generated.move_ids) || generated.move_ids.length === 0 ||
      generated.move_ids.some((id) => typeof id !== "string" || id.length === 0)) {
    throw new TypeError("generated.move_ids must be a non-empty string array");
  }
  return generated;
}

/**
 * Browser transport for one already-generated general-type wild encounter.
 *
 * Existing Mapless modules own request normalization, deterministic level
 * clamping, Day Board consumption, canLose launch and battle-rule cleanup.
 * Species selection, base-level generation and variance sampling remain an
 * explicit injected boundary until their private-main domains are available.
 */
export function resolveBrowserMaplessWildEncounter({
  day,
  event,
  boardIndex,
  generated,
  variance = 0,
  minLevel = 1,
  maxLevel = 100,
  gameTempPresent = true,
} = {}) {
  const projection = requireGeneratedEncounter(generated);
  const plan = buildWildEncounterIntegrationPlan({
    day,
    event,
    board_index: boardIndex,
    species_id: projection.species_id,
    base_level: projection.base_level,
    variance,
    min_level: minLevel,
    max_level: maxLevel,
    game_temp_present: gameTempPresent,
  });
  if (projection.required_type !== plan.request.required_type) {
    throw new RangeError("generated encounter type does not match the Day Board request");
  }
  const encounter = {
    species_id: projection.species_id,
    species_name: projection.species_name,
    level: plan.level,
    move_ids: [...projection.move_ids],
    source: "generated_browser_projection",
  };
  const requestOperation = {
    op: "create_general_type_encounter",
    type: plan.request.required_type,
    day: plan.request.day,
    category: plan.request.enemy_rank,
    modifier: plan.request.extra_modifier,
    final_flag: plan.request.use_variance,
  };
  return {
    request: plan.request,
    encounter,
    launch: plan.launch,
    cleanup: plan.cleanup,
    operations: [requestOperation, ...plan.launch],
  };
}
