import { clampEncounterLevel } from "./mapless-general-encounter-level-clamp.js";

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
 * Browser owner for one already-generated general-type wild encounter.
 *
 * The Web runtime now performs the canonical Day Board request -> level clamp
 * -> consume/canLose/start transition directly instead of routing through
 * request/launch/integration wrappers. Species selection, base-level generation
 * and variance sampling remain owned by the existing GENERAL data runtime.
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
  if (!event || event.kind !== "wild" || !event.type) {
    throw new Error("wild event with type is required");
  }
  if (!Number.isInteger(boardIndex) || boardIndex < 0 || boardIndex > 7) {
    throw new Error("board index must be an integer from 0 to 7");
  }
  if (typeof gameTempPresent !== "boolean") {
    throw new Error("gameTempPresent must be boolean");
  }

  const normalizedDay = Math.max(Number.isFinite(Number(day)) ? Math.trunc(Number(day)) : 0, 1);
  const request = {
    required_type: event.type,
    day: normalizedDay,
    enemy_rank: "NORMAL",
    extra_modifier: 0,
    use_variance: true,
  };
  if (projection.required_type !== request.required_type) {
    throw new RangeError("generated encounter type does not match the Day Board request");
  }

  const level = clampEncounterLevel(projection.base_level, variance, minLevel, maxLevel);
  const launch = [
    { op: "consume_cell", index: boardIndex, value: true },
    { op: "set_battle_rule", rule: "canLose" },
    { op: "start_wild_battle", species_id: projection.species_id, level },
  ];
  const cleanup = gameTempPresent ? [{ op: "clear_battle_rules" }] : [];
  const encounter = {
    species_id: projection.species_id,
    species_name: projection.species_name,
    level,
    move_ids: [...projection.move_ids],
    source: "generated_browser_projection",
  };
  const requestOperation = {
    op: "create_general_type_encounter",
    type: request.required_type,
    day: request.day,
    category: request.enemy_rank,
    modifier: request.extra_modifier,
    final_flag: request.use_variance,
  };
  return {
    request,
    encounter,
    launch,
    cleanup,
    operations: [requestOperation, ...launch],
  };
}
