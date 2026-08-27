// Frozen v0.9.108 Enemy Scaling + General Type Encounter stage-band projection.
// Sources:
// - Plugins/Enemy Scaling Engine/001_Enemy_Scaling_Engine.rb
// - Plugins/General Type Encounter Engine/001_General_Type_Encounter_Engine.rb
//
// This module owns only deterministic scaling arithmetic and the caller-owned
// variance draw. Species validity/materialization remains owned elsewhere.

const DAY_INTERVAL = 5;
const BASE_LEVEL = 3;
const LEVELS_PER_SCALING = 2;
const MIN_LEVEL = 1;
const MAX_LEVEL = 100;
const LEVEL_VARIANCE_VALUES = Object.freeze([-1, 0, 1]);
const RANK_MODIFIERS = Object.freeze({
  WEAK: -2,
  NORMAL: 0,
  STRONG: 2,
  VERY_STRONG: 4,
});

const STAGES_BEFORE_16 = Object.freeze([
  "NO_EVOLUTION",
  "ONE_EVOLUTION_BASE",
  "TWO_EVOLUTION_BASE",
]);
const STAGES_16_TO_24 = Object.freeze([
  "NO_EVOLUTION",
  "ONE_EVOLUTION_BASE",
  "TWO_EVOLUTION_MIDDLE",
]);
const STAGES_25_TO_35 = Object.freeze([
  "NO_EVOLUTION",
  "ONE_EVOLUTION_FINAL",
  "TWO_EVOLUTION_MIDDLE",
]);
const STAGES_36_OR_MORE = Object.freeze([
  "NO_EVOLUTION",
  "ONE_EVOLUTION_FINAL",
  "TWO_EVOLUTION_FINAL",
]);

function integerOrNull(value) {
  if (Number.isInteger(value)) return value;
  if (typeof value !== "string" || !/^[+-]?\d+$/.test(value.trim())) return null;
  return Number.parseInt(value, 10);
}

function normalizeDay(value) {
  const day = integerOrNull(value);
  if (day == null || day < 1) return null;
  return day;
}

function normalizeRank(value) {
  const rank = String(value ?? "").trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(RANK_MODIFIERS, rank) ? rank : null;
}

function clampLevel(value) {
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, value));
}

export function resolveMaplessV108DayScalingValue(day) {
  const normalizedDay = normalizeDay(day);
  if (normalizedDay == null) return null;
  return Math.floor((normalizedDay - 1) / DAY_INTERVAL);
}

export function resolveMaplessV108EffectiveScalingValue(
  day,
  rank = "NORMAL",
  extraModifier = 0,
) {
  const dayScaling = resolveMaplessV108DayScalingValue(day);
  const normalizedRank = normalizeRank(rank);
  const extra = integerOrNull(extraModifier);
  if (dayScaling == null || normalizedRank == null || extra == null) return null;
  return Math.max(0, dayScaling + RANK_MODIFIERS[normalizedRank] + extra);
}

export function resolveMaplessV108ScalingBaseLevel(scalingValue) {
  const scaling = integerOrNull(scalingValue);
  if (scaling == null) return null;
  return clampLevel(BASE_LEVEL + Math.max(0, scaling) * LEVELS_PER_SCALING);
}

export function resolveMaplessV108AllowedEvolutionStages(scalingValue) {
  const baseLevel = resolveMaplessV108ScalingBaseLevel(scalingValue);
  if (baseLevel == null) return [];
  if (baseLevel < 16) return [...STAGES_BEFORE_16];
  if (baseLevel < 25) return [...STAGES_16_TO_24];
  if (baseLevel < 36) return [...STAGES_25_TO_35];
  return [...STAGES_36_OR_MORE];
}

export function resolveMaplessV108ScaledEnemyLevel({
  day,
  rank = "NORMAL",
  extraModifier = 0,
  useVariance = true,
  randomInt = null,
} = {}) {
  const effectiveScaling = resolveMaplessV108EffectiveScalingValue(
    day,
    rank,
    extraModifier,
  );
  if (effectiveScaling == null) return null;

  const baseLevel = resolveMaplessV108ScalingBaseLevel(effectiveScaling);
  if (!useVariance) return baseLevel;
  if (typeof randomInt !== "function") return null;

  const index = randomInt(LEVEL_VARIANCE_VALUES.length);
  if (!Number.isInteger(index) || index < 0 || index >= LEVEL_VARIANCE_VALUES.length) {
    return null;
  }
  return clampLevel(baseLevel + LEVEL_VARIANCE_VALUES[index]);
}
