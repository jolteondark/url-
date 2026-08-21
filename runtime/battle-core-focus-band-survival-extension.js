function canonicalId(value) {
  const raw = typeof value === "string" ? value : value?.id;
  return String(raw ?? "").trim().toUpperCase();
}

function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

function heldItemCanonical(pokemon) {
  if (hasOwn(pokemon, "held_item")) return canonicalId(pokemon.held_item);
  return canonicalId(pokemon?.item);
}

function integerHp(pokemon, key, fallback = 0) {
  const value = key === "maxHp" ? (pokemon?.max_hp ?? pokemon?.maxHp) : pokemon?.[key];
  return Math.max(0, Math.trunc(Number(value ?? fallback)));
}

function normalizedRoll(value) {
  if (value === undefined || value === null) return null;
  const roll = Number(value);
  if (!Number.isInteger(roll) || roll < 0 || roll >= 100) throw new RangeError("Focus Band survival roll must be an integer in [0, 99]");
  return roll;
}

export const BATTLE_FOCUS_BAND_SURVIVAL_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze([]),
  itemIds: Object.freeze(["FOCUSBAND"]),
  abilityCount: 0,
  itemCount: 1,
  classificationCounts: Object.freeze({
    probabilisticSurvivalHeldItems: 1,
  }),
});

export function resolveFocusBandSurvivalCanonical({ target = {}, incomingDamage = 0, randomRoll = null } = {}) {
  const item = heldItemCanonical(target);
  const hp = integerHp(target, "hp");
  const damage = Math.max(0, Math.trunc(Number(incomingDamage ?? 0)));
  const lethal = hp > 0 && damage >= hp;
  const roll = normalizedRoll(randomRoll);
  const eligible = item === "FOCUSBAND" && lethal;
  const triggered = eligible && roll !== null && roll < 10;
  return Object.freeze({
    boundary: "survival",
    item,
    eligible,
    triggered,
    source: triggered ? "FOCUSBAND" : null,
    randomRoll: roll,
    chanceNumerator: 1,
    chanceDenominator: 10,
    damage: triggered ? Math.max(0, hp - 1) : damage,
    consumeRequest: null,
  });
}
