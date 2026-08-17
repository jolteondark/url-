// Lightweight Safari bootstrap projection from canonical source-v0.9.108.
//
// IMPORTANT: Do not import safari-general-encounter-data-loader.js here. This
// module is on the first-interaction bootstrap path. The full 875-species / 608
// GENERAL projection is installed on demand by combat entry.

const EXACT_BOOT_MOVES = Object.freeze({
  TACKLE: Object.freeze({ id: "TACKLE", name: "Tackle", category: "Physical", power: 40, accuracy: 100, total_pp: 35, priority: 0, type: "NORMAL", thaws_user: false }),
  QUICKATTACK: Object.freeze({ id: "QUICKATTACK", name: "Quick Attack", category: "Physical", power: 40, accuracy: 100, total_pp: 30, priority: 1, type: "NORMAL", thaws_user: false }),
  BITE: Object.freeze({ id: "BITE", name: "Bite", category: "Physical", power: 60, accuracy: 100, total_pp: 25, priority: 0, type: "DARK", thaws_user: false }),
  SWIFT: Object.freeze({ id: "SWIFT", name: "Swift", category: "Special", power: 60, accuracy: 0, total_pp: 20, priority: 0, type: "NORMAL", thaws_user: false }),
  THUNDERSHOCK: Object.freeze({ id: "THUNDERSHOCK", name: "Thunder Shock", category: "Special", power: 40, accuracy: 100, total_pp: 30, priority: 0, type: "ELECTRIC", thaws_user: false }),
});

export const SAFARI_MOVE_MASTERS = { ...EXACT_BOOT_MOVES };

const BOOT_SPECIES = Object.freeze({
  EEVEE: Object.freeze({
    id: "EEVEE", name: "Eevee", base_stats: Object.freeze({ HP: 55, ATTACK: 55, DEFENSE: 50, SPEED: 55, SPECIAL_ATTACK: 45, SPECIAL_DEFENSE: 65 }),
    base_exp: 65, catch_rate: 45, dex_number: 133, gender_ratio: "FemaleOneEighth",
  }),
  RATTATA: Object.freeze({
    id: "RATTATA", name: "Rattata", base_stats: Object.freeze({ HP: 30, ATTACK: 56, DEFENSE: 35, SPEED: 72, SPECIAL_ATTACK: 25, SPECIAL_DEFENSE: 35 }),
    base_exp: 51, catch_rate: 255, dex_number: 19, gender_ratio: "Female50Percent",
  }),
  PIKACHU: Object.freeze({
    id: "PIKACHU", name: "Pikachu", base_stats: Object.freeze({ HP: 35, ATTACK: 55, DEFENSE: 40, SPEED: 90, SPECIAL_ATTACK: 50, SPECIAL_DEFENSE: 50 }),
    base_exp: 112, catch_rate: 190, dex_number: 25, gender_ratio: "Female50Percent",
  }),
});

export const SAFARI_SPECIES_MASTERS = { ...BOOT_SPECIES };
let generalInstalled = false;

function installLazyMasterProjection(target, source) {
  const ids = Object.keys(source);
  for (const id of ids) {
    Object.defineProperty(target, id, {
      configurable: true,
      enumerable: true,
      get() {
        return source[id];
      },
      set(value) {
        Object.defineProperty(target, id, {
          configurable: true,
          enumerable: true,
          writable: true,
          value,
        });
      },
    });
  }
  return ids.length;
}

export function installSafariGeneralMasters(speciesMasters, moveMasters) {
  if (!speciesMasters || !moveMasters) throw new TypeError("general species and move masters are required");

  // safari-general-encounter-data-loader exposes lazy Proxy projections. A
  // direct Object.assign here enumerated and read every value, eagerly
  // materializing all 875 species and 608 moves before Battle entry could
  // continue. Preserve ordinary keyed access while deferring each source read
  // until that exact species/move is requested. The setter intentionally lets
  // encounter/trainer owners concretize only their selected masters with their
  // existing Object.assign calls.
  const speciesCount = installLazyMasterProjection(SAFARI_SPECIES_MASTERS, speciesMasters);
  const moveCount = installLazyMasterProjection(SAFARI_MOVE_MASTERS, moveMasters);
  Object.assign(SAFARI_MOVE_MASTERS, EXACT_BOOT_MOVES);
  generalInstalled = true;
  return { speciesCount, moveCount };
}

export function safariGeneralMastersInstalled() {
  return generalInstalled;
}

export const SAFARI_WILD_ENCOUNTER_PROJECTIONS = Object.freeze({
  ELECTRIC: Object.freeze({ required_type: "ELECTRIC", species_id: "PIKACHU", species_name: "PIKACHU", move_ids: Object.freeze(["THUNDERSHOCK"]), base_level_day_offset: 4, min_projected_base_level: 5, max_projected_base_level: 8, variance: 0, min_level: 1, max_level: 100 }),
});

export const SAFARI_NATURE_MASTERS = Object.freeze({ HARDY: Object.freeze({ id: "HARDY", stat_changes: Object.freeze([]) }) });
export const SAFARI_MOVE_LABELS = Object.freeze({ TACKLE: "たいあたり", QUICKATTACK: "でんこうせっか", BITE: "かみつく", SWIFT: "スピードスター", THUNDERSHOCK: "でんきショック" });
export const SAFARI_SHOP_ITEM_MASTERS = Object.freeze({ POTION: Object.freeze({ id: "POTION", name: "Potion", label: "キズぐすり", pocket: "MEDICINE", price: 200, sell_price: 50 }) });
export const SAFARI_NORMAL_SHOP_STOCK = Object.freeze(["POTION"]);
export const SAFARI_BOUNTY_PROJECTION = Object.freeze({ species: "RATTATA", species_name: "コラッタ", form: 0, level: 6, reward: 600, prefix: "凶暴な", gender: 2, move_ids: Object.freeze(["TACKLE"]) });
export const SAFARI_ZERO_STAT_VALUES = Object.freeze({ HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 });