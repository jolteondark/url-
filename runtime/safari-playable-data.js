import { projectSafariGeneralGrowthRates } from "./safari-general-growth-rate-facts.js";
import { safariGeneralSpeciesTypesV108 } from "./safari-general-species-type-facts.js";
import { projectSafariGeneralMoveEffectChanceV108 } from "./safari-general-move-effect-chance-facts.js";
import { projectSafariCanonicalMoveFunctionCodeV108 } from "./safari-canonical-move-function-code-facts.js";

// Lightweight Safari bootstrap projection from canonical source-v0.9.108.
//
// IMPORTANT: Do not import safari-general-encounter-data-loader.js here. This
// module is on the first-interaction bootstrap path. The full 875-species / 608
// GENERAL projection is installed on demand by combat entry.

function projectCanonicalMoveMaster(id, master) {
  return projectSafariCanonicalMoveFunctionCodeV108(id, projectSafariGeneralMoveEffectChanceV108(id, master));
}

const EXACT_BOOT_MOVES = Object.freeze({
  TACKLE: projectCanonicalMoveMaster("TACKLE", { id: "TACKLE", name: "Tackle", category: "Physical", power: 40, accuracy: 100, total_pp: 35, priority: 0, type: "NORMAL", thaws_user: false }),
  QUICKATTACK: projectCanonicalMoveMaster("QUICKATTACK", { id: "QUICKATTACK", name: "Quick Attack", category: "Physical", power: 40, accuracy: 100, total_pp: 30, priority: 1, type: "NORMAL", thaws_user: false }),
  BITE: projectCanonicalMoveMaster("BITE", { id: "BITE", name: "Bite", category: "Physical", power: 60, accuracy: 100, total_pp: 25, priority: 0, type: "DARK", thaws_user: false }),
  SWIFT: projectCanonicalMoveMaster("SWIFT", { id: "SWIFT", name: "Swift", category: "Special", power: 60, accuracy: 0, total_pp: 20, priority: 0, type: "NORMAL", thaws_user: false }),
  THUNDERSHOCK: projectCanonicalMoveMaster("THUNDERSHOCK", { id: "THUNDERSHOCK", name: "Thunder Shock", category: "Special", power: 40, accuracy: 100, total_pp: 30, priority: 0, type: "ELECTRIC", thaws_user: false }),
});

export const SAFARI_MOVE_MASTERS = { ...EXACT_BOOT_MOVES };

const BOOT_SPECIES = Object.freeze({
  EEVEE: Object.freeze({
    id: "EEVEE", name: "Eevee", types: Object.freeze(["NORMAL"]), base_stats: Object.freeze({ HP: 55, ATTACK: 55, DEFENSE: 50, SPEED: 55, SPECIAL_ATTACK: 45, SPECIAL_DEFENSE: 65 }),
    base_exp: 65, catch_rate: 45, dex_number: 133, gender_ratio: "FemaleOneEighth", growth_rate: "Medium",
  }),
  RATTATA: Object.freeze({
    id: "RATTATA", name: "Rattata", types: Object.freeze(["NORMAL"]), base_stats: Object.freeze({ HP: 30, ATTACK: 56, DEFENSE: 35, SPEED: 72, SPECIAL_ATTACK: 25, SPECIAL_DEFENSE: 35 }),
    base_exp: 51, catch_rate: 255, dex_number: 19, gender_ratio: "Female50Percent", growth_rate: "Medium",
  }),
  PIKACHU: Object.freeze({
    id: "PIKACHU", name: "Pikachu", types: Object.freeze(["ELECTRIC"]), base_stats: Object.freeze({ HP: 35, ATTACK: 55, DEFENSE: 40, SPEED: 90, SPECIAL_ATTACK: 50, SPECIAL_DEFENSE: 50 }),
    base_exp: 112, catch_rate: 190, dex_number: 25, gender_ratio: "Female50Percent", growth_rate: "Medium",
  }),
});

export const SAFARI_SPECIES_MASTERS = { ...BOOT_SPECIES };
let generalInstalled = false;

function installLazyMasterProjection(target, source, projectValue = null) {
  const ids = Object.keys(source);
  for (const id of ids) {
    let projected = false;
    let projectedValue;
    const resolveValue = (value) => {
      if (!projected) {
        projectedValue = projectValue ? projectValue(id, value) : value;
        projected = true;
      }
      return projectedValue;
    };
    Object.defineProperty(target, id, {
      configurable: true,
      enumerable: true,
      get() {
        return resolveValue(source[id]);
      },
      set(value) {
        const next = projectValue ? projectValue(id, value) : value;
        projected = true;
        projectedValue = next;
        Object.defineProperty(target, id, {
          configurable: true,
          enumerable: true,
          writable: true,
          value: next,
        });
      },
    });
  }
  return ids.length;
}

function snapshotMasterDescriptors(target, ids) {
  const snapshot = new Map();
  for (const id of ids) snapshot.set(id, Object.getOwnPropertyDescriptor(target, id) ?? null);
  return snapshot;
}

function restoreMasterDescriptors(target, snapshot) {
  for (const [id, descriptor] of snapshot) {
    if (descriptor) Object.defineProperty(target, id, descriptor);
    else Reflect.deleteProperty(target, id);
  }
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
  //
  // GrowthRate, type membership and move additional-effect chance/function code
  // are generated from canonical PBS-derived data separately from the compressed
  // GENERAL payload. Compose them at this shared master boundary so selected
  // runtime objects consume one canonical fact source without eagerly reading all
  // 875 species / 608 moves.
  //
  // Installation is transactional. A Safari/runtime failure after only part of
  // the descriptors were defined must not leave shared masters half-mutated
  // while generalInstalled remains false; same-session retry starts from the
  // exact pre-install bootstrap state instead.
  const speciesIds = Object.keys(speciesMasters);
  const moveIds = Object.keys(moveMasters);
  const growthRates = projectSafariGeneralGrowthRates(speciesIds);
  const speciesSnapshot = snapshotMasterDescriptors(SAFARI_SPECIES_MASTERS, speciesIds);
  const moveSnapshot = snapshotMasterDescriptors(
    SAFARI_MOVE_MASTERS,
    [...new Set([...moveIds, ...Object.keys(EXACT_BOOT_MOVES)])],
  );

  try {
    const speciesCount = installLazyMasterProjection(SAFARI_SPECIES_MASTERS, speciesMasters, (id, master) => {
      const growthRate = growthRates[id];
      if (!growthRate) throw new Error(`missing canonical Safari growth rate for ${id}`);
      if (master?.growth_rate != null && master.growth_rate !== growthRate) {
        throw new Error(`Safari growth-rate mismatch for ${id}: ${master.growth_rate}/${growthRate}`);
      }
      const types = safariGeneralSpeciesTypesV108(id);
      return Object.freeze({ ...master, growth_rate: growthRate, types });
    });
    const moveCount = installLazyMasterProjection(SAFARI_MOVE_MASTERS, moveMasters, projectCanonicalMoveMaster);
    Object.assign(SAFARI_MOVE_MASTERS, EXACT_BOOT_MOVES);
    generalInstalled = true;
    return { speciesCount, moveCount };
  } catch (error) {
    restoreMasterDescriptors(SAFARI_SPECIES_MASTERS, speciesSnapshot);
    restoreMasterDescriptors(SAFARI_MOVE_MASTERS, moveSnapshot);
    generalInstalled = false;
    throw error;
  }
}

export function safariGeneralMastersInstalled() {
  return generalInstalled;
}

export function safariCanonicalResetMoves(speciesId, level) {
  if (!generalInstalled) throw new Error("Safari GENERAL masters are not installed");
  const master = SAFARI_SPECIES_MASTERS[speciesId];
  if (!master) throw new RangeError(`unknown Safari GENERAL species: ${speciesId}`);
  if (!Array.isArray(master.level_moves)) throw new Error(`missing Safari GENERAL level-up moves: ${speciesId}`);
  const currentLevel = Math.max(1, Math.min(100, Math.trunc(Number(level))));
  const knowable = master.level_moves
    .filter((entry) => entry.level >= 0 && entry.level <= currentLevel)
    .map((entry) => entry.move);
  const seen = new Set();
  const dedupedReversed = [];
  for (let index = knowable.length - 1; index >= 0; index -= 1) {
    const move = knowable[index];
    if (seen.has(move)) continue;
    seen.add(move);
    dedupedReversed.push(move);
  }
  const resolved = dedupedReversed.reverse().slice(-4);
  if (resolved.length === 0) throw new Error(`canonical reset_moves produced no moves for ${speciesId} Lv.${currentLevel}`);
  return resolved;
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