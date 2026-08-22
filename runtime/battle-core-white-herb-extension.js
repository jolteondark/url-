const BATTLE_STAT_STAGE_KEYS = Object.freeze([
  "ATTACK",
  "DEFENSE",
  "SPECIAL_ATTACK",
  "SPECIAL_DEFENSE",
  "SPEED",
  "ACCURACY",
  "EVASION",
]);

function canonicalId(value) {
  const raw = value && typeof value === "object"
    ? (value.id ?? value.ID ?? value.name)
    : value;
  return String(raw ?? "").trim().toUpperCase();
}

function heldItemCanonical(pokemon) {
  if (!pokemon || typeof pokemon !== "object" || Array.isArray(pokemon)) return "";
  if (Object.prototype.hasOwnProperty.call(pokemon, "held_item")) return canonicalId(pokemon.held_item);
  return canonicalId(pokemon.item);
}

function subjectCanonical(subject) {
  const value = String(subject ?? "user").toLowerCase();
  if (value !== "user" && value !== "target") {
    throw new RangeError(`White Herb subject must be user or target: ${subject}`);
  }
  return value;
}

export const BATTLE_WHITE_HERB_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze([]),
  itemIds: Object.freeze(["WHITEHERB"]),
  abilityCount: 0,
  itemCount: 1,
  classificationCounts: Object.freeze({
    statStageRestorationHeldItems: 1,
  }),
});

export function resolveWhiteHerbActionAfterCanonical({
  pokemon = {},
  statStages = {},
  subject = "user",
} = {}) {
  const normalizedSubject = subjectCanonical(subject);
  const item = heldItemCanonical(pokemon);
  if (item !== "WHITEHERB") {
    return Object.freeze({
      boundary: "action_after",
      item,
      triggered: false,
      statChanges: Object.freeze([]),
      consumeRequest: null,
    });
  }

  const statChanges = [];
  for (const stat of BATTLE_STAT_STAGE_KEYS) {
    const stage = Math.trunc(Number(statStages?.[stat] ?? 0));
    if (!Number.isFinite(stage) || stage >= 0) continue;
    statChanges.push(Object.freeze({
      subject: normalizedSubject,
      stat,
      delta: -stage,
    }));
  }

  const triggered = statChanges.length > 0;
  return Object.freeze({
    boundary: "action_after",
    item,
    triggered,
    statChanges: Object.freeze(statChanges),
    consumeRequest: triggered
      ? Object.freeze({
        item: "WHITEHERB",
        permanent: true,
        reason: "white_herb_restore_lowered_stats",
      })
      : null,
  });
}
