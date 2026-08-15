// Generated distributable browser projection from the canonical source-v0.9.108
// PBS records. Raw PBS text is intentionally not embedded.

export const SAFARI_SPECIES_MASTERS = Object.freeze({
  EEVEE: Object.freeze({
    id: "EEVEE",
    types: Object.freeze(["NORMAL"]),
    base_stats: Object.freeze({
      HP: 55, ATTACK: 55, DEFENSE: 50,
      SPECIAL_ATTACK: 45, SPECIAL_DEFENSE: 65, SPEED: 55,
    }),
    growth_rate: "Medium",
    abilities: Object.freeze(["RUNAWAY", "ADAPTABILITY"]),
    hidden_abilities: Object.freeze(["ANTICIPATION"]),
    base_exp: 65,
    catch_rate: 45,
  }),
  PIKACHU: Object.freeze({
    id: "PIKACHU",
    types: Object.freeze(["ELECTRIC"]),
    base_stats: Object.freeze({
      HP: 35, ATTACK: 55, DEFENSE: 40,
      SPECIAL_ATTACK: 50, SPECIAL_DEFENSE: 50, SPEED: 90,
    }),
    growth_rate: "Medium",
    abilities: Object.freeze(["STATIC"]),
    hidden_abilities: Object.freeze(["LIGHTNINGROD"]),
    base_exp: 112,
    catch_rate: 190,
  }),
  RATTATA: Object.freeze({
    id: "RATTATA",
    types: Object.freeze(["NORMAL"]),
    base_stats: Object.freeze({
      HP: 30, ATTACK: 56, DEFENSE: 35,
      SPECIAL_ATTACK: 25, SPECIAL_DEFENSE: 35, SPEED: 72,
    }),
    growth_rate: "Medium",
    abilities: Object.freeze(["RUNAWAY", "GUTS"]),
    hidden_abilities: Object.freeze(["HUSTLE"]),
    base_exp: 51,
    catch_rate: 255,
  }),
});

// Generated browser input for the external General Type Encounter selection
// seam. The private-main request/clamp/launch domains consume this projection;
// it is not a second implementation of species-pool or EnemyScaling rules.
export const SAFARI_WILD_ENCOUNTER_PROJECTIONS = Object.freeze({
  ELECTRIC: Object.freeze({
    required_type: "ELECTRIC",
    species_id: "PIKACHU",
    species_name: "ピカチュウ",
    move_ids: Object.freeze(["THUNDERSHOCK"]),
    base_level_day_offset: 4,
    min_projected_base_level: 5,
    max_projected_base_level: 8,
    variance: 0,
    min_level: 1,
    max_level: 100,
  }),
});

export const SAFARI_MOVE_MASTERS = Object.freeze({
  TACKLE: Object.freeze({
    id: "TACKLE", name: "Tackle", type: "NORMAL", category: "Physical",
    power: 40, accuracy: 100, total_pp: 35, target: "NearOther", priority: 0,
  }),
  QUICKATTACK: Object.freeze({
    id: "QUICKATTACK", name: "Quick Attack", type: "NORMAL", category: "Physical",
    power: 40, accuracy: 100, total_pp: 30, target: "NearOther", priority: 1,
  }),
  BITE: Object.freeze({
    id: "BITE", name: "Bite", type: "DARK", category: "Physical",
    power: 60, accuracy: 100, total_pp: 25, target: "NearOther", priority: 0,
  }),
  SWIFT: Object.freeze({
    id: "SWIFT", name: "Swift", type: "NORMAL", category: "Special",
    power: 60, accuracy: 0, total_pp: 20, target: "AllNearFoes", priority: 0,
  }),
  THUNDERSHOCK: Object.freeze({
    id: "THUNDERSHOCK", name: "Thunder Shock", type: "ELECTRIC", category: "Special",
    power: 40, accuracy: 100, total_pp: 30, target: "NearOther", priority: 0,
  }),
});

export const SAFARI_NATURE_MASTERS = Object.freeze({
  HARDY: Object.freeze({ id: "HARDY", stat_changes: Object.freeze([]) }),
});

export const SAFARI_MOVE_LABELS = Object.freeze({
  TACKLE: "たいあたり",
  QUICKATTACK: "でんこうせっか",
  BITE: "かみつく",
  SWIFT: "スピードスター",
  THUNDERSHOCK: "でんきショック",
});

// Minimal distributable shop projection. Item mutation, capacity checks and
// Money commits remain owned by the private-main Bag/Economy runtime.
export const SAFARI_SHOP_ITEM_MASTERS = Object.freeze({
  POTION: Object.freeze({
    id: "POTION",
    name: "Potion",
    label: "キズぐすり",
    pocket: "MEDICINE",
    price: 200,
    sell_price: 50,
  }),
});

export const SAFARI_NORMAL_SHOP_STOCK = Object.freeze(["POTION"]);

export const SAFARI_ZERO_STAT_VALUES = Object.freeze({
  HP: 0,
  ATTACK: 0,
  DEFENSE: 0,
  SPECIAL_ATTACK: 0,
  SPECIAL_DEFENSE: 0,
  SPEED: 0,
});
