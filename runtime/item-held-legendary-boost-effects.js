export const HELD_LEGENDARY_BOOST_SOURCE_CANONICAL = Object.freeze({
  canonical: "Mapless v0.9.108 / Essentials v21.1 Battle::ItemEffects::DamageCalcFromUser + Gen9 Pack copies",
  mechanicsGeneration: 9,
  powerMultiplier: 1.2,
  finalDamageMultiplier: 1.2,
  soulDewPowersUpTypes: true,
});

export const HELD_LEGENDARY_BOOST_RULES_CANONICAL = Object.freeze({
  ADAMANTORB: Object.freeze({ species: Object.freeze(["DIALGA"]), types: Object.freeze(["DRAGON", "STEEL"]), multiplierKind: "power" }),
  ADAMANTCRYSTAL: Object.freeze({ species: Object.freeze(["DIALGA"]), types: Object.freeze(["DRAGON", "STEEL"]), multiplierKind: "power" }),
  LUSTROUSORB: Object.freeze({ species: Object.freeze(["PALKIA"]), types: Object.freeze(["DRAGON", "WATER"]), multiplierKind: "power" }),
  LUSTROUSGLOBE: Object.freeze({ species: Object.freeze(["PALKIA"]), types: Object.freeze(["DRAGON", "WATER"]), multiplierKind: "power" }),
  GRISEOUSORB: Object.freeze({ species: Object.freeze(["GIRATINA"]), types: Object.freeze(["DRAGON", "GHOST"]), multiplierKind: "power" }),
  GRISEOUSCORE: Object.freeze({ species: Object.freeze(["GIRATINA"]), types: Object.freeze(["DRAGON", "GHOST"]), multiplierKind: "power" }),
  SOULDEW: Object.freeze({ species: Object.freeze(["LATIAS", "LATIOS"]), types: Object.freeze(["DRAGON", "PSYCHIC"]), multiplierKind: "final" }),
});

export const HELD_LEGENDARY_BOOST_ITEM_IDS_CANONICAL = Object.freeze(Object.keys(HELD_LEGENDARY_BOOST_RULES_CANONICAL).sort());

function id(value) {
  if (value && typeof value === "object") return String(value.id ?? value.ID ?? value.name ?? "").trim().toUpperCase();
  return String(value ?? "").trim().toUpperCase();
}

function abilityId(pokemon) {
  if (pokemon && Object.prototype.hasOwnProperty.call(pokemon, "ability")) return id(pokemon.ability);
  return id(pokemon?.ability_id);
}

function heldItemId(pokemon) {
  if (pokemon?.held_item_effect_suppressed === true || abilityId(pokemon) === "KLUTZ") return null;
  if (pokemon && Object.prototype.hasOwnProperty.call(pokemon, "held_item")) return id(pokemon.held_item) || null;
  return id(pokemon?.item) || null;
}

function speciesId(pokemon) {
  return id(pokemon?.species ?? pokemon?.species_id ?? pokemon?.speciesId);
}

export function resolveHeldLegendaryBoostCanonical({ user = {}, move = {} } = {}) {
  const item = heldItemId(user);
  const rule = item ? HELD_LEGENDARY_BOOST_RULES_CANONICAL[item] ?? null : null;
  const species = speciesId(user);
  const moveType = id(move?.type);
  const speciesMatches = Boolean(rule && rule.species.includes(species));
  const typeMatches = Boolean(rule && rule.types.includes(moveType));
  const triggered = Boolean(rule && speciesMatches && typeMatches);
  const powerMultiplier = triggered && rule.multiplierKind === "power"
    ? HELD_LEGENDARY_BOOST_SOURCE_CANONICAL.powerMultiplier
    : 1;
  const finalDamageMultiplier = triggered && rule.multiplierKind === "final"
    ? HELD_LEGENDARY_BOOST_SOURCE_CANONICAL.finalDamageMultiplier
    : 1;
  return Object.freeze({
    boundary: "action_before",
    item,
    species: species || null,
    moveType: moveType || null,
    speciesMatches,
    typeMatches,
    multiplierKind: rule?.multiplierKind ?? null,
    triggered,
    powerMultiplier,
    finalDamageMultiplier,
  });
}

export const BATTLE_LEGENDARY_HELD_BOOST_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze([]),
  itemIds: HELD_LEGENDARY_BOOST_ITEM_IDS_CANONICAL,
  abilityCount: 0,
  itemCount: HELD_LEGENDARY_BOOST_ITEM_IDS_CANONICAL.length,
  classificationCounts: Object.freeze({ speciesTypePowerHeldItems: 6, speciesTypeFinalDamageHeldItems: 1 }),
});
