import { applyBerryConsumptionSuppressionCanonical } from "./battle-core-berry-consumption-suppression-extension.js";

export const HELD_STATUS_CURE_BERRY_SOURCE_CANONICAL = Object.freeze({
  canonical: "Mapless v0.9.108 / Essentials v21.1 Battle::ItemEffects::StatusCure + pbItemStatusCureCheck + Gen9 Pack copies",
  mechanicsGeneration: 9,
});

export const HELD_STATUS_CURE_BERRY_RULES_CANONICAL = Object.freeze({
  CHERIBERRY: Object.freeze({ statuses: Object.freeze(["PARALYSIS"]) }),
  CHESTOBERRY: Object.freeze({ statuses: Object.freeze(["SLEEP", "DROWSY"]) }),
  PECHABERRY: Object.freeze({ statuses: Object.freeze(["POISON"]) }),
  RAWSTBERRY: Object.freeze({ statuses: Object.freeze(["BURN"]) }),
  ASPEARBERRY: Object.freeze({ statuses: Object.freeze(["FROZEN", "FROSTBITE"]) }),
  PERSIMBERRY: Object.freeze({ confusion: true }),
  LUMBERRY: Object.freeze({ anyStatus: true, confusion: true }),
});

export const HELD_STATUS_CURE_BERRY_ITEM_IDS_CANONICAL = Object.freeze(
  Object.keys(HELD_STATUS_CURE_BERRY_RULES_CANONICAL).sort(),
);

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

function statusId(pokemon) {
  return id(pokemon?.status || "NONE") || "NONE";
}

function confusionCount(value) {
  const count = Number(value ?? 0);
  return Number.isInteger(count) && count > 0 ? count : 0;
}

function activeOpposingPokemon(pokemon) {
  return Number(pokemon?.hp ?? 0) > 0 ? pokemon : {};
}

export function heldStatusCureBerryItemIdCanonical(pokemon = {}) {
  if (pokemon?.held_item_effect_suppressed === true || abilityId(pokemon) === "KLUTZ") return null;
  const item = heldItemId(pokemon);
  return Object.prototype.hasOwnProperty.call(HELD_STATUS_CURE_BERRY_RULES_CANONICAL, item) ? item : null;
}

export function resolveHeldStatusCureBerryCanonical({ pokemon = {}, confusionTurns = 0, opposingPokemon = {} } = {}) {
  const item = heldStatusCureBerryItemIdCanonical(pokemon);
  const status = statusId(pokemon);
  const confusion = confusionCount(confusionTurns);
  if (!item) {
    return Object.freeze({
      boundary: "status_cure_check",
      triggered: false,
      item: null,
      statusBefore: status,
      statusCured: false,
      confusionBefore: confusion,
      confusionCured: false,
      consumeRequest: null,
      reason: "no_active_status_cure_berry",
    });
  }
  if (Number(pokemon?.hp ?? 0) <= 0) {
    return Object.freeze({
      boundary: "status_cure_check",
      triggered: false,
      item,
      statusBefore: status,
      statusCured: false,
      confusionBefore: confusion,
      confusionCured: false,
      consumeRequest: null,
      reason: "fainted",
    });
  }

  const rule = HELD_STATUS_CURE_BERRY_RULES_CANONICAL[item];
  const statusCured = status !== "NONE" && Boolean(
    rule.anyStatus || (Array.isArray(rule.statuses) && rule.statuses.includes(status)),
  );
  const confusionCured = confusion > 0 && rule.confusion === true;
  const base = Object.freeze({
    boundary: "status_cure_check",
    triggered: statusCured || confusionCured,
    item,
    statusBefore: status,
    statusCured,
    confusionBefore: confusion,
    confusionCured,
    consumeRequest: statusCured || confusionCured
      ? Object.freeze({ item, reason: "held_status_cure_berry" })
      : null,
    reason: statusCured || confusionCured ? "cure" : "condition_not_met",
  });
  const suppressed = applyBerryConsumptionSuppressionCanonical(base, {
    consumer: pokemon,
    opposing: activeOpposingPokemon(opposingPokemon),
  });
  if (!suppressed.blockedByBerrySuppression) return suppressed;
  return Object.freeze({
    ...suppressed,
    statusCured: false,
    confusionCured: false,
    reason: "blocked_by_unnerve",
  });
}

export function commitHeldStatusCureBerryCanonical(input = {}) {
  const pokemon = structuredClone(input.pokemon ?? {});
  const confusionTurns = confusionCount(input.confusionTurns);
  const resolution = resolveHeldStatusCureBerryCanonical(input);
  if (!resolution.triggered) {
    return Object.freeze({ pokemon, confusionTurns, resolution });
  }

  if (resolution.statusCured) {
    pokemon.status = "NONE";
    pokemon.status_count = 0;
  }
  if (hasOwn(pokemon, "held_item")) pokemon.held_item = null;
  if (hasOwn(pokemon, "item")) pokemon.item = null;

  return Object.freeze({
    pokemon,
    confusionTurns: resolution.confusionCured ? 0 : confusionTurns,
    resolution,
  });
}

export const BATTLE_HELD_STATUS_CURE_BERRY_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze([]),
  itemIds: HELD_STATUS_CURE_BERRY_ITEM_IDS_CANONICAL,
  abilityCount: 0,
  itemCount: HELD_STATUS_CURE_BERRY_ITEM_IDS_CANONICAL.length,
  classificationCounts: Object.freeze({ automaticHeldStatusCureBerries: HELD_STATUS_CURE_BERRY_ITEM_IDS_CANONICAL.length }),
});
