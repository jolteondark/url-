const SLEEP_STATUSES = Object.freeze(["SLEEP", "DROWSY"]);
const FROZEN_STATUSES = Object.freeze(["FROZEN", "FROSTBITE"]);

const UNIVERSAL_STATUS_ITEMS = [
  "FULLHEAL",
  "LAVACOOKIE",
  "OLDGATEAU",
  "CASTELIACONE",
  "LUMIOSEGALETTE",
  "SHALOURSABLE",
  "BIGMALASADA",
  "PEWTERCRUNCHIES",
  "LUMBERRY",
  "RAGECANDYBAR",
];

function targeted(statuses, options = {}) {
  return Object.freeze({ kind: "primary_status", statuses: Object.freeze([...statuses]), consumable: options.consumable !== false, ...options });
}

function universal(options = {}) {
  return Object.freeze({ kind: "all_status", consumable: options.consumable !== false, ...options });
}

export const STATUS_HEALING_ITEM_EFFECT_SOURCE = Object.freeze({
  canonical: "Mapless v0.9.108 / Essentials v21.1 Item_Effects + Generation 9 Pack item handlers",
  mechanicsGeneration: 9,
  rageCandyBarCuresStatusProblems: true,
  generation9Statuses: Object.freeze(["DROWSY", "FROSTBITE"]),
});

export const STATUS_HEALING_ITEM_EFFECTS = Object.freeze({
  AWAKENING: targeted(SLEEP_STATUSES),
  CHESTOBERRY: targeted(SLEEP_STATUSES),
  BLUEFLUTE: targeted(SLEEP_STATUSES, { consumable: false, soundproofBlockedInBattle: true }),
  POKEFLUTE: targeted(SLEEP_STATUSES, { consumable: false, battleUse: "all_active_battlers", soundproofBlockedInBattle: true }),
  ANTIDOTE: targeted(["POISON"]),
  PECHABERRY: targeted(["POISON"]),
  BURNHEAL: targeted(["BURN"]),
  RAWSTBERRY: targeted(["BURN"]),
  PARALYZEHEAL: targeted(["PARALYSIS"]),
  PARLYZHEAL: targeted(["PARALYSIS"]),
  CHERIBERRY: targeted(["PARALYSIS"]),
  ICEHEAL: targeted(FROZEN_STATUSES),
  ASPEARBERRY: targeted(FROZEN_STATUSES),
  ...Object.fromEntries(UNIVERSAL_STATUS_ITEMS.map((id) => [id, universal()])),
  HEALPOWDER: universal({ happinessMethod: "powder" }),
  FULLRESTORE: Object.freeze({ kind: "full_restore", consumable: true }),
  PERSIMBERRY: Object.freeze({ kind: "confusion", consumable: true, fieldUse: false, requiresActiveBattler: true }),
  YELLOWFLUTE: Object.freeze({ kind: "confusion", consumable: false, fieldUse: false, soundproofBlockedInBattle: true, requiresActiveBattler: true }),
});

export function normalizePrimaryStatus(status) {
  if (status == null) return null;
  const id = String(status).trim().toUpperCase();
  return !id || id === "NONE" ? null : id;
}

export function isStatusHealingItem(itemId) {
  return Object.prototype.hasOwnProperty.call(STATUS_HEALING_ITEM_EFFECTS, String(itemId ?? "").toUpperCase());
}

export function isBattleMassStatusHealingItem(itemId) {
  const effect = STATUS_HEALING_ITEM_EFFECTS[String(itemId ?? "").toUpperCase()];
  return effect?.battleUse === "all_active_battlers";
}

export function isStatusHealingItemUsableInContext(itemId, context = "field") {
  const effect = STATUS_HEALING_ITEM_EFFECTS[String(itemId ?? "").toUpperCase()];
  if (!effect) return false;
  if (context === "field") return effect.fieldUse !== false;
  return context === "battle";
}

export function statusHealingItemIsConsumable(itemId) {
  const effect = STATUS_HEALING_ITEM_EFFECTS[String(itemId ?? "").toUpperCase()];
  return effect ? effect.consumable !== false : true;
}

export function statusHealingItemCanAffectPokemon({ itemId, pokemon, context = "field", confusionTurns = 0, soundproof = false, activeBattler = true } = {}) {
  const id = String(itemId ?? "").toUpperCase();
  const effect = STATUS_HEALING_ITEM_EFFECTS[id];
  if (!effect || !isStatusHealingItemUsableInContext(id, context)) return false;
  const hp = Math.max(0, Math.trunc(Number(pokemon?.hp ?? 0)));
  if (!pokemon || Number(pokemon.steps_to_hatch ?? 0) > 0 || hp <= 0) return false;
  const maxHp = Math.max(1, Math.trunc(Number(pokemon.max_hp ?? hp ?? 1)));
  const status = normalizePrimaryStatus(pokemon.status);
  const confused = context === "battle" && Number(confusionTurns) > 0;
  if (effect.requiresActiveBattler && context === "battle" && !activeBattler) return false;
  if (effect.soundproofBlockedInBattle && context === "battle" && activeBattler && soundproof) return false;
  if (effect.kind === "primary_status") return effect.statuses.includes(status);
  if (effect.kind === "all_status") return status !== null || confused;
  if (effect.kind === "full_restore") return hp < maxHp || status !== null || confused;
  if (effect.kind === "confusion") return confused;
  return false;
}

export function resolveStatusHealingItemEffect({ itemId, pokemon, context = "field", confusionTurns = 0, soundproof = false, activeBattler = true } = {}) {
  const id = String(itemId ?? "").toUpperCase();
  const effect = STATUS_HEALING_ITEM_EFFECTS[id];
  if (!effect) return { used: false, result: "unsupported_item" };
  if (!isStatusHealingItemUsableInContext(id, context)) return { used: false, result: "unsupported_context" };
  const hpBefore = Math.max(0, Math.trunc(Number(pokemon?.hp ?? 0)));
  if (!pokemon || Number(pokemon.steps_to_hatch ?? 0) > 0) return { used: false, result: "invalid_target" };
  if (hpBefore <= 0) return { used: false, result: "fainted_target" };
  const maxHp = Math.max(1, Math.trunc(Number(pokemon.max_hp ?? hpBefore ?? 1)));
  const statusBefore = normalizePrimaryStatus(pokemon.status);
  const confusedBefore = context === "battle" && Number(confusionTurns) > 0;
  if (!statusHealingItemCanAffectPokemon({ itemId: id, pokemon, context, confusionTurns, soundproof, activeBattler })) {
    return { used: false, result: "no_effect" };
  }
  const curePrimary = effect.kind === "primary_status" || effect.kind === "all_status" || effect.kind === "full_restore";
  const cureConfusion = context === "battle" && (effect.kind === "all_status" || effect.kind === "full_restore" || effect.kind === "confusion");
  const hpAfter = effect.kind === "full_restore" ? maxHp : hpBefore;
  return {
    used: true,
    result: "used",
    itemId: id,
    hpBefore,
    hpAfter,
    hpGain: hpAfter - hpBefore,
    statusBefore,
    statusAfter: curePrimary ? null : statusBefore,
    statusCured: curePrimary && statusBefore !== null,
    confusionBefore: confusedBefore,
    confusionAfter: cureConfusion ? false : confusedBefore,
    confusionCured: cureConfusion && confusedBefore,
    happinessMethod: effect.happinessMethod ?? null,
    consumable: effect.consumable !== false,
  };
}
