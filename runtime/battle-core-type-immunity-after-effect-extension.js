const TYPE_IMMUNITY_AFTER_EFFECT_ABILITIES = Object.freeze([
  "DRYSKIN",
  "EARTHEATER",
  "FLASHFIRE",
  "LIGHTNINGROD",
  "MOTORDRIVE",
  "SAPSIPPER",
  "STORMDRAIN",
  "VOLTABSORB",
  "WATERABSORB",
  "WELLBAKEDBODY",
]);

function integerHp(pokemon, key) {
  const value = key === "maxHp" ? (pokemon?.max_hp ?? pokemon?.maxHp) : pokemon?.[key];
  return Math.max(0, Math.trunc(Number(value ?? 0)));
}

function frozenChanges(changes) {
  return Object.freeze((Array.isArray(changes) ? changes : []).map((change) => Object.freeze({
    subject: String(change?.subject ?? "target"),
    stat: String(change?.stat ?? ""),
    delta: Number(change?.delta ?? 0),
  })));
}

export function resolveTypeImmunityAfterEffectHookCanonical({ target = {}, typeImmunityResolution = null } = {}) {
  const resolution = typeImmunityResolution && typeof typeImmunityResolution === "object"
    ? typeImmunityResolution
    : null;
  const afterEffect = resolution?.afterEffect ?? null;
  if (resolution?.immune !== true || !afterEffect) {
    return Object.freeze({
      boundary: "action_after",
      triggered: false,
      source: null,
      hpDelta: 0,
      statChanges: Object.freeze([]),
      activation: null,
    });
  }

  if (afterEffect.kind === "heal") {
    const hp = integerHp(target, "hp");
    const maxHp = integerHp(target, "maxHp");
    const [numerator, denominator] = Array.isArray(afterEffect.hpFraction) ? afterEffect.hpFraction : [0, 1];
    const rawHeal = denominator > 0 && maxHp > 0
      ? Math.max(1, Math.floor(maxHp * Number(numerator ?? 0) / Number(denominator)))
      : 0;
    const hpDelta = hp > 0 ? Math.min(Math.max(0, maxHp - hp), rawHeal) : 0;
    return Object.freeze({
      boundary: "action_after",
      triggered: true,
      source: "ability_type_immunity",
      hpDelta,
      statChanges: Object.freeze([]),
      activation: null,
    });
  }

  if (afterEffect.kind === "stat_stage") {
    return Object.freeze({
      boundary: "action_after",
      triggered: true,
      source: "ability_type_immunity",
      hpDelta: 0,
      statChanges: frozenChanges(afterEffect.changes),
      activation: null,
    });
  }

  if (afterEffect.kind === "activate") {
    return Object.freeze({
      boundary: "action_after",
      triggered: true,
      source: "ability_type_immunity",
      hpDelta: 0,
      statChanges: Object.freeze([]),
      activation: Object.freeze({ flag: String(afterEffect.flag ?? "") }),
    });
  }

  throw new RangeError(`unsupported type-immunity after-effect kind: ${afterEffect.kind}`);
}

export const BATTLE_TYPE_IMMUNITY_AFTER_EFFECT_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: TYPE_IMMUNITY_AFTER_EFFECT_ABILITIES,
  abilityCount: TYPE_IMMUNITY_AFTER_EFFECT_ABILITIES.length,
  itemIds: Object.freeze([]),
  itemCount: 0,
  classificationCounts: Object.freeze({
    hpAbsorb: 4,
    statStageAbsorb: 5,
    activationAbsorb: 1,
  }),
});
