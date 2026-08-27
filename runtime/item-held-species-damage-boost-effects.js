export const HELD_SPECIES_DAMAGE_BOOST_SOURCE = Object.freeze({
  canonical: "Mapless v0.9.108 / Essentials v21.1 Battle::ItemEffects::DamageCalcFromUser + Generation 9 Pack item handlers",
  mechanicsGeneration: 9,
});

const POWER_BOOSTS = Object.freeze({
  ADAMANTORB: Object.freeze({ species: Object.freeze(["DIALGA"]), types: Object.freeze(["DRAGON", "STEEL"]), multiplier: 1.2 }),
  ADAMANTCRYSTAL: Object.freeze({ species: Object.freeze(["DIALGA"]), types: Object.freeze(["DRAGON", "STEEL"]), multiplier: 1.2 }),
  LUSTROUSORB: Object.freeze({ species: Object.freeze(["PALKIA"]), types: Object.freeze(["DRAGON", "WATER"]), multiplier: 1.2 }),
  LUSTROUSGLOBE: Object.freeze({ species: Object.freeze(["PALKIA"]), types: Object.freeze(["DRAGON", "WATER"]), multiplier: 1.2 }),
  GRISEOUSORB: Object.freeze({ species: Object.freeze(["GIRATINA"]), types: Object.freeze(["DRAGON", "GHOST"]), multiplier: 1.2 }),
  GRISEOUSCORE: Object.freeze({ species: Object.freeze(["GIRATINA"]), types: Object.freeze(["DRAGON", "GHOST"]), multiplier: 1.2 }),
});

const FINAL_DAMAGE_BOOSTS = Object.freeze({
  SOULDEW: Object.freeze({ species: Object.freeze(["LATIAS", "LATIOS"]), types: Object.freeze(["DRAGON", "PSYCHIC"]), multiplier: 1.2 }),
  WELLSPRINGMASK: Object.freeze({ species: Object.freeze(["OGERPON"]), types: null, multiplier: 1.2 }),
  HEARTHFLAMEMASK: Object.freeze({ species: Object.freeze(["OGERPON"]), types: null, multiplier: 1.2 }),
  CORNERSTONEMASK: Object.freeze({ species: Object.freeze(["OGERPON"]), types: null, multiplier: 1.2 }),
});

export const HELD_SPECIES_DAMAGE_BOOST_ITEM_IDS = Object.freeze([
  ...Object.keys(POWER_BOOSTS),
  ...Object.keys(FINAL_DAMAGE_BOOSTS),
].sort());

function id(value) {
  if (value && typeof value === "object") return String(value.id ?? value.ID ?? value.name ?? "").trim().toUpperCase();
  return String(value ?? "").trim().toUpperCase();
}

function applies(entry, species, moveType) {
  if (!entry || !entry.species.includes(species)) return false;
  return entry.types === null || entry.types.includes(moveType);
}

export function resolveHeldSpeciesDamageBoostCanonical({ itemId, species, moveType } = {}) {
  const item = id(itemId);
  const speciesId = id(species);
  const type = id(moveType);
  const power = POWER_BOOSTS[item] ?? null;
  const finalDamage = FINAL_DAMAGE_BOOSTS[item] ?? null;
  const powerApplies = applies(power, speciesId, type);
  const finalDamageApplies = applies(finalDamage, speciesId, type);
  return Object.freeze({
    item,
    species: speciesId,
    moveType: type,
    triggered: powerApplies || finalDamageApplies,
    powerMultiplier: powerApplies ? power.multiplier : 1,
    finalDamageMultiplier: finalDamageApplies ? finalDamage.multiplier : 1,
    source: powerApplies ? "species_type_power_boost" : (finalDamageApplies ? "species_final_damage_boost" : null),
  });
}
