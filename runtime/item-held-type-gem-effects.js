export const HELD_TYPE_GEM_SOURCE_CANONICAL = Object.freeze({
  canonical: "Mapless v0.9.108 / Essentials v21.1 Battle::ItemEffects::DamageCalcFromUser + pbMoveTypePoweringUpGem",
  mechanicsGeneration: 9,
  powerMultiplier: 1.3,
});

export const TYPE_GEM_TYPE_BY_ITEM_CANONICAL = Object.freeze({
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

export const HELD_TYPE_GEM_ITEM_IDS_CANONICAL = Object.freeze(
  Object.keys(TYPE_GEM_TYPE_BY_ITEM_CANONICAL).sort(),
);

const PLEDGE_IDS_CANONICAL = new Set(["FIREPLEDGE", "GRASSPLEDGE", "WATERPLEDGE"]);

function id(value) {
  if (value && typeof value === "object") return String(value.id ?? value.ID ?? value.name ?? "").trim().toUpperCase();
  return String(value ?? "").trim().toUpperCase();
}

function abilityId(pokemon) {
  if (pokemon && Object.prototype.hasOwnProperty.call(pokemon, "ability")) return id(pokemon.ability);
  return id(pokemon?.ability_id);
}

function rawHeldItemId(pokemon) {
  if (pokemon && Object.prototype.hasOwnProperty.call(pokemon, "held_item")) return id(pokemon.held_item);
  return id(pokemon?.item);
}

export function heldTypeGemItemIdCanonical(pokemon = {}) {
  if (pokemon?.held_item_effect_suppressed === true || abilityId(pokemon) === "KLUTZ") return null;
  const item = rawHeldItemId(pokemon);
  return TYPE_GEM_TYPE_BY_ITEM_CANONICAL[item] ? item : null;
}

function moveTypeCanonical(move) {
  return id(move?.type);
}

function pledgeMoveCanonical(move) {
  return PLEDGE_IDS_CANONICAL.has(id(move?.id))
    || PLEDGE_IDS_CANONICAL.has(id(move?.function_code))
    || PLEDGE_IDS_CANONICAL.has(id(move?.functionCode));
}

function damagingPowerCanonical(move) {
  const power = Number(move?.power ?? move?.base_power ?? move?.basePower ?? 0);
  return Number.isFinite(power) && power > 0;
}

export function resolveTypeGemActionBeforeCanonical({ user = {}, move = {} } = {}) {
  const item = heldTypeGemItemIdCanonical(user);
  const gemType = item ? TYPE_GEM_TYPE_BY_ITEM_CANONICAL[item] : null;
  const moveType = moveTypeCanonical(move);
  const typeMatches = Boolean(gemType && gemType === moveType);
  const blockedByPledge = typeMatches && pledgeMoveCanonical(move);
  const triggered = typeMatches && damagingPowerCanonical(move) && !blockedByPledge;
  return Object.freeze({
    boundary: "action_before",
    item,
    gemType,
    moveType,
    typeMatches,
    blockedByPledge,
    triggered,
    powerMultiplier: triggered ? HELD_TYPE_GEM_SOURCE_CANONICAL.powerMultiplier : 1,
  });
}

export function resolveTypeGemActionAfterCanonical({ user = {}, move = {}, damageDealt = 0 } = {}) {
  const item = heldTypeGemItemIdCanonical(user);
  const gemType = item ? TYPE_GEM_TYPE_BY_ITEM_CANONICAL[item] : null;
  const moveType = moveTypeCanonical(move);
  const typeMatches = Boolean(gemType && gemType === moveType);
  const blockedByPledge = typeMatches && pledgeMoveCanonical(move);
  const dealtDamage = Number(damageDealt ?? 0);
  const triggered = typeMatches && !blockedByPledge && Number.isFinite(dealtDamage) && dealtDamage > 0;
  return Object.freeze({
    boundary: "action_after",
    item,
    gemType,
    moveType,
    typeMatches,
    blockedByPledge,
    triggered,
    consumeRequest: triggered
      ? Object.freeze({
          item,
          itemIsBerry: false,
          effectKind: "type_gem",
          permanent: true,
        })
      : null,
  });
}

export const BATTLE_TYPE_GEM_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze([]),
  itemIds: HELD_TYPE_GEM_ITEM_IDS_CANONICAL,
  abilityCount: 0,
  itemCount: HELD_TYPE_GEM_ITEM_IDS_CANONICAL.length,
  classificationCounts: Object.freeze({
    typeGemHeldItems: HELD_TYPE_GEM_ITEM_IDS_CANONICAL.length,
  }),
});
