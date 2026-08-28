const GEM_TYPE_BY_ITEM_CANONICAL = Object.freeze({
  BUGGEM: "BUG",
  DARKGEM: "DARK",
  DRAGONGEM: "DRAGON",
  ELECTRICGEM: "ELECTRIC",
  FAIRYGEM: "FAIRY",
  FIGHTINGGEM: "FIGHTING",
  FIREGEM: "FIRE",
  FLYINGGEM: "FLYING",
  GHOSTGEM: "GHOST",
  GRASSGEM: "GRASS",
  GROUNDGEM: "GROUND",
  ICEGEM: "ICE",
  NORMALGEM: "NORMAL",
  POISONGEM: "POISON",
  PSYCHICGEM: "PSYCHIC",
  ROCKGEM: "ROCK",
  STEELGEM: "STEEL",
  WATERGEM: "WATER",
});

const PLEDGE_FUNCTION_CODES_CANONICAL = new Set(["GRASSPLEDGE", "FIREPLEDGE", "WATERPLEDGE"]);

export const HELD_GEM_SOURCE_CANONICAL = Object.freeze({
  canonical: "Mapless v0.9.108 / Pokemon Essentials v21.1 Battle::Battler#pbMoveTypePoweringUpGem",
  mechanicsGeneration: 9,
  powerMultiplier: 1.3,
  pledgeMovesConsumeGem: false,
});

export const HELD_GEM_ITEM_IDS_CANONICAL = Object.freeze(Object.keys(GEM_TYPE_BY_ITEM_CANONICAL).sort());

function id(value) {
  if (value && typeof value === "object") return String(value.id ?? value.ID ?? value.name ?? "").trim().toUpperCase();
  return String(value ?? "").trim().toUpperCase();
}

function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

function abilityId(pokemon) {
  if (hasOwn(pokemon, "ability")) return id(pokemon.ability);
  return id(pokemon?.ability_id);
}

function heldItemId(pokemon) {
  if (hasOwn(pokemon, "held_item")) return id(pokemon.held_item);
  return id(pokemon?.item);
}

function itemEffectsSuppressedCanonical(user = {}, context = {}) {
  return user?.held_item_effect_suppressed === true
    || abilityId(user) === "KLUTZ"
    || context?.itemSuppressed === true
    || context?.magicRoomActive === true
    || context?.embargoActive === true;
}

function moveCanReachDamageCalculationCanonical(move = {}) {
  const category = id(move?.category);
  if (category === "STATUS") return false;
  const power = Number(move?.power ?? 0);
  return Number.isFinite(power) && power > 0;
}

export function resolveHeldGemPowerCanonical({ user = {}, move = {}, context = {} } = {}) {
  const item = heldItemId(user);
  const gemType = GEM_TYPE_BY_ITEM_CANONICAL[item] ?? null;
  const moveType = id(move?.type);
  const functionCode = id(move?.function_code ?? move?.functionCode);
  const pledgeMove = PLEDGE_FUNCTION_CODES_CANONICAL.has(functionCode);
  const suppressed = itemEffectsSuppressedCanonical(user, context);
  const matchingType = Boolean(gemType && moveType === gemType);
  const damagingMove = moveCanReachDamageCalculationCanonical(move);
  const triggered = Boolean(gemType && matchingType && damagingMove && !pledgeMove && !suppressed);
  return Object.freeze({
    boundary: "damage_calc_from_user",
    item: gemType ? item : null,
    gemType,
    moveType,
    functionCode,
    matchingType,
    damagingMove,
    pledgeMove,
    suppressed,
    triggered,
    powerMultiplier: triggered ? HELD_GEM_SOURCE_CANONICAL.powerMultiplier : 1,
    consumeArmed: triggered,
  });
}

export function consumeHeldGemCanonical(pokemon = {}, gemResolution = null) {
  const next = structuredClone(pokemon ?? {});
  const item = heldItemId(next);
  const expected = id(gemResolution?.item);
  const consume = gemResolution?.triggered === true
    && Boolean(expected)
    && item === expected
    && Boolean(GEM_TYPE_BY_ITEM_CANONICAL[expected]);
  if (!consume) return Object.freeze({ pokemon: next, consumed: false, item: null });
  if (hasOwn(next, "held_item")) next.held_item = null;
  if (hasOwn(next, "item")) next.item = null;
  return Object.freeze({ pokemon: next, consumed: true, item: expected });
}

export const BATTLE_HELD_GEM_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze([]),
  itemIds: HELD_GEM_ITEM_IDS_CANONICAL,
  abilityCount: 0,
  itemCount: HELD_GEM_ITEM_IDS_CANONICAL.length,
  classificationCounts: Object.freeze({ typePoweringGems: HELD_GEM_ITEM_IDS_CANONICAL.length }),
});
