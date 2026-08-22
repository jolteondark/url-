function canonicalId(value) {
  const raw = typeof value === "string" ? value : value?.id;
  return String(raw ?? "").trim().toUpperCase();
}

function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

function abilityCanonical(pokemon) {
  if (hasOwn(pokemon, "ability")) return canonicalId(pokemon.ability);
  return canonicalId(pokemon?.ability_id);
}

function normalizeSourceKind(value) {
  const sourceKind = String(value ?? "other").trim().toLowerCase();
  if (["self", "opposing_move", "other"].includes(sourceKind)) return sourceKind;
  throw new RangeError(`unsupported stat-stage change source kind: ${value}`);
}

function normalizeChange(change) {
  if (!change || typeof change !== "object" || Array.isArray(change)) {
    throw new TypeError("stat-stage change must be an object");
  }
  const delta = Number(change.delta ?? 0);
  if (!Number.isFinite(delta)) throw new TypeError("stat-stage change delta must be finite");
  return { ...change, delta };
}

export const BATTLE_STAT_STAGE_ABILITY_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze(["CONTRARY", "SIMPLE"]),
  itemIds: Object.freeze([]),
  abilityCount: 2,
  itemCount: 0,
  classificationCounts: Object.freeze({
    statStageChangeModifierAbilities: 2,
  }),
});

export function resolveBattleStatStageAbilityChangeCanonical({
  pokemon = {},
  change,
  sourceKind = "other",
  moldBreaker = false,
} = {}) {
  const normalizedChange = normalizeChange(change);
  const normalizedSourceKind = normalizeSourceKind(sourceKind);
  const ability = abilityCanonical(pokemon);
  const abilityIgnored = Boolean(moldBreaker) && normalizedSourceKind === "opposing_move"
    && (ability === "CONTRARY" || ability === "SIMPLE");

  if (abilityIgnored || normalizedChange.delta === 0) {
    return Object.freeze({
      change: Object.freeze(normalizedChange),
      source: null,
      modified: false,
      abilityIgnored,
    });
  }

  if (ability === "CONTRARY") {
    return Object.freeze({
      change: Object.freeze({ ...normalizedChange, delta: -normalizedChange.delta }),
      source: "CONTRARY",
      modified: true,
      abilityIgnored: false,
    });
  }

  if (ability === "SIMPLE") {
    return Object.freeze({
      change: Object.freeze({ ...normalizedChange, delta: normalizedChange.delta * 2 }),
      source: "SIMPLE",
      modified: true,
      abilityIgnored: false,
    });
  }

  return Object.freeze({
    change: Object.freeze(normalizedChange),
    source: null,
    modified: false,
    abilityIgnored: false,
  });
}
