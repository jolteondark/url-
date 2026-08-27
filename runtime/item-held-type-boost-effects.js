export const HELD_TYPE_POWER_BOOST_SOURCE = Object.freeze({
  canonical: "Mapless v0.9.108 / Essentials v21.1 Battle::ItemEffects::DamageCalcFromUser",
  mechanicsGeneration: 9,
  multiplier: 1.2,
});

export const HELD_TYPE_POWER_BOOSTS = Object.freeze({
  BLACKBELT: "FIGHTING",
  BLACKGLASSES: "DARK",
  CHARCOAL: "FIRE",
  DRAGONFANG: "DRAGON",
  HARDSTONE: "ROCK",
  MAGNET: "ELECTRIC",
  METALCOAT: "STEEL",
  MIRACLESEED: "GRASS",
  MYSTICWATER: "WATER",
  NEVERMELTICE: "ICE",
  POISONBARB: "POISON",
  SHARPBEAK: "FLYING",
  SILKSCARF: "NORMAL",
  SILVERPOWDER: "BUG",
  SOFTSAND: "GROUND",
  SPELLTAG: "GHOST",
  TWISTEDSPOON: "PSYCHIC",
  FAIRYFEATHER: "FAIRY",

  ODDINCENSE: "PSYCHIC",
  ROCKINCENSE: "ROCK",
  ROSEINCENSE: "GRASS",
  SEAINCENSE: "WATER",
  WAVEINCENSE: "WATER",

  FISTPLATE: "FIGHTING",
  DREADPLATE: "DARK",
  FLAMEPLATE: "FIRE",
  DRACOPLATE: "DRAGON",
  STONEPLATE: "ROCK",
  ZAPPLATE: "ELECTRIC",
  IRONPLATE: "STEEL",
  MEADOWPLATE: "GRASS",
  SPLASHPLATE: "WATER",
  ICICLEPLATE: "ICE",
  TOXICPLATE: "POISON",
  SKYPLATE: "FLYING",
  PIXIEPLATE: "FAIRY",
  INSECTPLATE: "BUG",
  EARTHPLATE: "GROUND",
  SPOOKYPLATE: "GHOST",
  MINDPLATE: "PSYCHIC",
  BLANKPLATE: "NORMAL",
});

export const HELD_TYPE_POWER_BOOST_ITEM_IDS = Object.freeze(Object.keys(HELD_TYPE_POWER_BOOSTS).sort());

function id(value) {
  if (value && typeof value === "object") return String(value.id ?? value.ID ?? value.name ?? "").trim().toUpperCase();
  return String(value ?? "").trim().toUpperCase();
}

export function isHeldTypePowerBoostItem(itemId) {
  return Object.prototype.hasOwnProperty.call(HELD_TYPE_POWER_BOOSTS, id(itemId));
}

export function heldTypePowerBoostType(itemId) {
  return HELD_TYPE_POWER_BOOSTS[id(itemId)] ?? null;
}

export function heldTypePowerMultiplier({ itemId, moveType } = {}) {
  const boostedType = heldTypePowerBoostType(itemId);
  return boostedType && boostedType === id(moveType) ? HELD_TYPE_POWER_BOOST_SOURCE.multiplier : 1;
}
