export const CAN_INFLICT_STATUS_SOURCE_V108 = Object.freeze({
  sourceSymbol: "Battle::Battler#pbCanInflictStatus?",
  sourceSection: "Battler_Statuses",
  sourceScriptIndex: 163,
  sourceSectionSha256: "a063652e8465748be772da9798eb36c689621cbda2de0d509cee0023220befb9",
  sourceSliceLines: Object.freeze([26, 173]),
  sourceSliceSha256: "3e233a8ca79022e94c5faeebcd2a163889c7d45fb6fc9e66e61598d7c740c22c",
});

const MAJOR_STATUSES = new Set(["SLEEP", "POISON", "BURN", "PARALYSIS", "FROZEN"]);

function statusId(value) {
  const id = String(value ?? "NONE").toUpperCase();
  if (id === "NONE" || MAJOR_STATUSES.has(id)) return id;
  throw new RangeError(`unsupported major status: ${id}`);
}

function typeSet(value) {
  return new Set((Array.isArray(value) ? value : []).map((entry) => String(entry).toUpperCase()));
}

function blocked(reason) {
  return { canInflict: false, reason, source: CAN_INFLICT_STATUS_SOURCE_V108 };
}

export function canInflictMajorStatusCanonical(input = {}) {
  const newStatus = statusId(input.newStatus);
  if (newStatus === "NONE") throw new RangeError("newStatus must be a major status");
  const currentStatus = statusId(input.currentStatus);
  const ignoreStatus = Boolean(input.ignoreStatus);
  const selfInflicted = Boolean(input.selfInflicted);
  const movePresent = input.movePresent !== false;
  const moldBreaker = Boolean(input.moldBreaker);

  if (Boolean(input.fainted)) return blocked("fainted");
  if (currentStatus === newStatus && !ignoreStatus) return blocked("already_statused");
  if (currentStatus !== "NONE" && !ignoreStatus && !(selfInflicted && movePresent)) {
    return blocked("other_major_status");
  }
  if (Number(input.substituteHp ?? 0) > 0 && !Boolean(input.moveIgnoresSubstitute) && !selfInflicted) {
    return blocked("substitute");
  }

  const weather = String(input.effectiveWeather ?? "None");
  if (newStatus === "FROZEN" && (weather === "Sun" || weather === "HarshSun")) {
    return blocked("sun_prevents_freeze");
  }

  if (Boolean(input.affectedByTerrain)) {
    const terrain = String(input.terrain ?? "None");
    if (terrain === "Electric" && newStatus === "SLEEP") return blocked("electric_terrain_prevents_sleep");
    if (terrain === "Misty") return blocked("misty_terrain_prevents_status");
  }

  if (
    newStatus === "SLEEP" && Boolean(input.uproarActive) &&
    !(Boolean(input.soundproofActive) && !moldBreaker)
  ) {
    return blocked("uproar_prevents_sleep");
  }

  const types = typeSet(input.targetTypes);
  const moreTypeEffects = input.moreTypeEffects !== false;
  if (newStatus === "POISON" && !Boolean(input.userCorrosion) && (types.has("POISON") || types.has("STEEL"))) {
    return blocked("type_immunity");
  }
  if (newStatus === "BURN" && types.has("FIRE")) return blocked("type_immunity");
  if (newStatus === "PARALYSIS" && moreTypeEffects && types.has("ELECTRIC")) return blocked("type_immunity");
  if (newStatus === "FROZEN" && types.has("ICE")) return blocked("type_immunity");

  if (Boolean(input.statusImmunityNonIgnorable)) return blocked("ability_immunity_non_ignorable");
  if (
    (selfInflicted || !moldBreaker) &&
    (Boolean(input.statusImmunityAbility) || Boolean(input.statusImmunityFromAlly))
  ) {
    return blocked("ability_immunity");
  }

  if (
    Number(input.safeguardTurns ?? 0) > 0 && !selfInflicted && movePresent &&
    !Boolean(input.userInfiltrator)
  ) {
    return blocked("safeguard");
  }

  return { canInflict: true, reason: "allowed", source: CAN_INFLICT_STATUS_SOURCE_V108 };
}
