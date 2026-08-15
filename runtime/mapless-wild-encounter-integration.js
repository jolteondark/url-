import { buildWildEncounterRequest } from "./mapless-day-board-wild-request.js";
import { clampEncounterLevel } from "./mapless-general-encounter-level-clamp.js";
import { buildWildBattleLaunchPlan } from "./mapless-day-board-wild-battle-launch.js";
import { buildBattleRuleCleanupPlan } from "./mapless-day-board-battle-rule-cleanup.js";

export function buildWildEncounterIntegrationPlan(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("integration input object is required");
  }
  const request = buildWildEncounterRequest(input.day, input.event);
  const level = clampEncounterLevel(
    input.base_level,
    input.variance,
    input.min_level,
    input.max_level
  );
  const launch = buildWildBattleLaunchPlan(input.board_index, {
    species_id: input.species_id,
    level
  });
  const cleanup = buildBattleRuleCleanupPlan(input.game_temp_present);
  return { request, level, launch, cleanup };
}
