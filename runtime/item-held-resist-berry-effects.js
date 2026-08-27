export const RESIST_BERRY_SOURCE_CANONICAL = Object.freeze({
  canonical: "Mapless v0.9.108 / Pokemon Essentials v21.1 Battle::Battler#pbMoveTypeWeakeningBerry",
  mechanicsGeneration: 9,
  normalTypeException: true,
  baseFinalDamageMultiplier: 0.5,
  ripenFinalDamageMultiplier: 0.25,
});

export const RESIST_BERRY_TYPE_BY_ITEM_CANONICAL = Object.freeze({
  BABIRIBERRY: "STEEL",
  CHARTIBERRY: "ROCK",
  CHILANBERRY: "NORMAL",
  CHOPLEBERRY: "FIGHTING",
  COBABERRY: "FLYING",
  COLBURBERRY: "DARK",
  HABANBERRY: "DRAGON",
  KASIBBERRY: "GHOST",
  KEBIABERRY: "POISON",
  OCCABERRY: "FIRE",
  PASSHOBERRY: "WATER",
  PAYAPABERRY: "PSYCHIC",
  RINDOBERRY: "GRASS",
  ROSELIBERRY: "FAIRY",
  SHUCABERRY: "GROUND",
  TANGABERRY: "BUG",
  WACANBERRY: "ELECTRIC",
  YACHEBERRY: "ICE",
});

export const RESIST_BERRY_ITEM_IDS_CANONICAL = Object.freeze(Object.keys(RESIST_BERRY_TYPE_BY_ITEM_CANONICAL));

export const BATTLE_RESIST_BERRY_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze(["KLUTZ", "RIPEN"]),
  itemIds: RESIST_BERRY_ITEM_IDS_CANONICAL,
  abilityCount: 2,
  itemCount: RESIST_BERRY_ITEM_IDS_CANONICAL.length,
  classificationCounts: Object.freeze({ typeWeakeningBerries: RESIST_BERRY_ITEM_IDS_CANONICAL.length }),
});

function canonicalId(value) {
  if (value && typeof value === "object") return String(value.id ?? value.ID ?? value.name ?? "").trim().toUpperCase();
  return String(value ?? "").trim().toUpperCase();
}

function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

export function resistBerryHeldItemIdCanonical(pokemon = {}) {
  const raw = hasOwn(pokemon, "held_item") ? pokemon.held_item : pokemon?.item;
  return canonicalId(raw);
}

function abilityIdCanonical(pokemon = {}) {
  const raw = hasOwn(pokemon, "ability") ? pokemon.ability : pokemon?.ability_id;
  return canonicalId(raw);
}

function heldItemActiveCanonical(pokemon = {}) {
  if (pokemon?.held_item_effect_suppressed === true) return false;
  return abilityIdCanonical(pokemon) !== "KLUTZ";
}

export function resolveResistBerryDamageCanonical({ target = {}, move = {}, typeMod = 1 } = {}) {
  const item = resistBerryHeldItemIdCanonical(target);
  const berryType = RESIST_BERRY_TYPE_BY_ITEM_CANONICAL[item] ?? null;
  const moveType = canonicalId(move?.type);
  const effectiveness = Number(typeMod ?? 1);
  const itemActive = heldItemActiveCanonical(target);
  const matchingType = Boolean(berryType && moveType === berryType);
  const superEffective = Number.isFinite(effectiveness) && effectiveness > 1;
  const normalException = moveType === "NORMAL";
  const eligible = itemActive && matchingType && (superEffective || normalException);
  const ripen = eligible && abilityIdCanonical(target) === "RIPEN";
  const finalDamageMultiplier = eligible ? (ripen ? 0.25 : 0.5) : 1;
  return Object.freeze({
    item,
    berryType,
    moveType,
    typeMod: Number.isFinite(effectiveness) ? effectiveness : 1,
    matchingType,
    superEffective,
    normalException,
    ripen,
    triggered: eligible,
    finalDamageMultiplier,
    boundary: "damage_calc_from_target",
  });
}

export function resolveResistBerryActionAfterCanonical({ target = {}, move = {}, typeMod = 1, damageDealt = 0 } = {}) {
  const damage = resolveResistBerryDamageCanonical({ target, move, typeMod });
  const dealt = Math.max(0, Math.trunc(Number(damageDealt ?? 0)));
  const triggered = damage.triggered && dealt > 0;
  return Object.freeze({
    ...damage,
    triggered,
    damageDealt: dealt,
    consumeRequest: triggered
      ? Object.freeze({ item: damage.item, itemIsBerry: true, effectKind: "type_weakening", permanent: true })
      : null,
    boundary: "action_after",
  });
}
