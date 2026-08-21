function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

function canonicalId(value) {
  const raw = typeof value === "string" ? value : value?.id;
  return String(raw ?? "").toUpperCase();
}

function abilityId(pokemon) {
  if (hasOwn(pokemon, "ability")) return canonicalId(pokemon.ability);
  return canonicalId(pokemon?.ability_id);
}

function itemId(pokemon) {
  if (hasOwn(pokemon, "held_item")) return canonicalId(pokemon.held_item);
  return canonicalId(pokemon?.item);
}

function weatherId(context) {
  return String(context?.effectiveWeather ?? context?.weather ?? "");
}

function integerHp(pokemon, key) {
  const value = key === "maxHp" ? (pokemon?.max_hp ?? pokemon?.maxHp) : pokemon?.[key];
  return Math.max(0, Math.trunc(Number(value ?? 0)));
}

function optionalUnitRoll(value) {
  if (value === undefined || value === null) return null;
  const roll = Number(value);
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new RangeError("shedSkinRoll must be a finite unit roll in [0, 1)");
  }
  return roll;
}

const ABILITY_IDS = Object.freeze(["HYDRATION", "SHEDSKIN"]);
const ITEM_IDS = Object.freeze(["STICKYBARB"]);
const RAIN_WEATHERS = new Set(["Rain", "HeavyRain"]);
const SHED_SKIN_NUMERATOR = 1;
const SHED_SKIN_DENOMINATOR = 3;

export function resolveTurnEndStatusItemExtensionCanonical(pokemon = {}, context = {}) {
  const ability = abilityId(pokemon);
  const item = itemId(pokemon);
  const status = canonicalId(pokemon?.status ?? "NONE") || "NONE";
  const hp = integerHp(pokemon, "hp");
  const maxHp = integerHp(pokemon, "maxHp");
  const weather = weatherId(context);
  const alive = hp > 0 && maxHp > 0;

  const hydrationCures = alive
    && ability === "HYDRATION"
    && status !== "NONE"
    && RAIN_WEATHERS.has(weather);
  const shedSkinEligible = alive
    && ability === "SHEDSKIN"
    && status !== "NONE";
  const shedSkinRoll = shedSkinEligible ? optionalUnitRoll(context?.shedSkinRoll) : null;
  const shedSkinCures = shedSkinEligible
    && shedSkinRoll !== null
    && shedSkinRoll < (SHED_SKIN_NUMERATOR / SHED_SKIN_DENOMINATOR);
  const statusCureRequest = hydrationCures
    ? Object.freeze({ status, source: "ability", ability: "HYDRATION" })
    : (shedSkinCures
      ? Object.freeze({ status, source: "ability", ability: "SHEDSKIN" })
      : null);
  const statusCureChanceRequest = shedSkinEligible
    ? Object.freeze({
      status,
      source: "ability",
      ability: "SHEDSKIN",
      numerator: SHED_SKIN_NUMERATOR,
      denominator: SHED_SKIN_DENOMINATOR,
    })
    : null;

  let hpDelta = 0;
  let reason = null;
  if (alive && item === "STICKYBARB") {
    hpDelta = -Math.min(hp, Math.max(1, Math.floor(maxHp / 8)));
    reason = "sticky_barb";
  }

  return Object.freeze({
    boundary: "turn_end",
    ability,
    item,
    triggered: statusCureRequest !== null || hpDelta !== 0,
    hpDelta,
    reason,
    statusCureRequest,
    statusCureChanceRequest,
  });
}

export const BATTLE_TURN_END_STATUS_ITEM_EXTENSION_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: ABILITY_IDS,
  itemIds: ITEM_IDS,
  abilityCount: ABILITY_IDS.length,
  itemCount: ITEM_IDS.length,
  classificationCounts: Object.freeze({
    turnEndStatusCureAbilities: 2,
    probabilisticTurnEndStatusCureAbilities: 1,
    turnEndDamageHeldItems: 1,
  }),
});
