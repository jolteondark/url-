import { resolveCanonicalBattleStartTimeOfDay } from "./battle-start-time-of-day.js";
import { maplessPlayerSecretIdV108 } from "./mapless-player-identity-v108.js";

export const MAPLESS_SAFARI_MAP_ID_V108 = 1;
export const MAPLESS_SAFARI_MAP001_ENVIRONMENT_V108 = "NONE";

function creationDayNight(now) {
  const battleTime = resolveCanonicalBattleStartTimeOfDay(now);
  return battleTime === "EVE" ? "EVENING" : battleTime;
}

export function resolveSafariNewPokemonCreationContextV108(runtime, { now = new Date() } = {}) {
  if (!runtime || typeof runtime !== "object" || Array.isArray(runtime)) throw new TypeError("Safari runtime is required");
  return Object.freeze({
    mapId: MAPLESS_SAFARI_MAP_ID_V108,
    environment: MAPLESS_SAFARI_MAP001_ENVIRONMENT_V108,
    dayNight: creationDayNight(now),
    playerSecretId: maplessPlayerSecretIdV108(runtime.player),
  });
}
