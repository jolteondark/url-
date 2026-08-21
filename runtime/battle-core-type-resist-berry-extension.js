import {
  battlePokemonAbilityIdCanonical,
  battlePokemonHeldItemIdCanonical,
} from "./battle-core-ability-item-modifiers.js";
import { resolveBerryConsumptionSuppressionCanonical } from "./battle-core-berry-consumption-suppression-extension.js";

const TYPE_RESIST_BERRY_BY_ITEM = Object.freeze({
  OCCABERRY: "FIRE",
  PASSHOBERRY: "WATER",
  WACANBERRY: "ELECTRIC",
  RINDOBERRY: "GRASS",
  YACHEBERRY: "ICE",
  CHOPLEBERRY: "FIGHTING",
  KEBIABERRY: "POISON",
  SHUCABERRY: "GROUND",
  COBABERRY: "FLYING",
  PAYAPABERRY: "PSYCHIC",
  TANGABERRY: "BUG",
  CHARTIBERRY: "ROCK",
  KASIBBERRY: "GHOST",
  HABANBERRY: "DRAGON",
  COLBURBERRY: "DARK",
  BABIRIBERRY: "STEEL",
  CHILANBERRY: "NORMAL",
  ROSELIBERRY: "FAIRY",
});

function canonicalId(value) {
  const raw = typeof value === "string" ? value : value?.id;
  return String(raw ?? "").trim().toUpperCase();
}

function itemEffectsSuppressedCanonical(pokemon = {}, context = {}) {
  return battlePokemonAbilityIdCanonical(pokemon) === "KLUTZ"
    || Boolean(context?.itemSuppressed)
    || Boolean(context?.magicRoomActive)
    || Boolean(context?.embargoActive);
}

function damagingMoveCanonical(move = {}) {
  return String(move?.category ?? "Status") !== "Status";
}

function typeResistBerryApplicabilityCanonical({ user = {}, target = {}, move = {}, context = {} } = {}) {
  const item = battlePokemonHeldItemIdCanonical(target);
  const berryType = TYPE_RESIST_BERRY_BY_ITEM[item] ?? null;
  const moveType = canonicalId(move?.type);
  const typeMod = Number(context?.typeMod ?? 1);
  const suppressed = itemEffectsSuppressedCanonical(target, context);
  const consumptionSuppression = resolveBerryConsumptionSuppressionCanonical({ consumer: target, opposing: user, context });
  const matchingType = Boolean(berryType && moveType === berryType);
  const chilan = item === "CHILANBERRY";
  const qualifyingEffectiveness = chilan ? true : Number.isFinite(typeMod) && typeMod > 1;
  const eligible = Boolean(
    berryType
    && matchingType
    && damagingMoveCanonical(move)
    && qualifyingEffectiveness
    && !suppressed
    && !consumptionSuppression.blocked
  );
  const ripen = eligible && battlePokemonAbilityIdCanonical(target) === "RIPEN";
  return Object.freeze({
    item,
    berryType,
    moveType,
    typeMod,
    chilan,
    matchingType,
    suppressed,
    berryConsumptionSuppression: consumptionSuppression,
    blockedByBerrySuppression: consumptionSuppression.blocked,
    eligible,
    ripen,
  });
}

export function resolveTypeResistBerryActionBeforeCanonical({ user = {}, target = {}, move = {}, context = {} } = {}) {
  const applicability = typeResistBerryApplicabilityCanonical({ user, target, move, context });
  return Object.freeze({
    boundary: "action_before",
    ...applicability,
    triggered: applicability.eligible,
    damageMultiplier: applicability.eligible ? (applicability.ripen ? 0.25 : 0.5) : 1,
    consumeRequest: null,
  });
}

export function resolveTypeResistBerryActionAfterCanonical({ user = {}, target = {}, move = {}, damageDealt = 0, context = {} } = {}) {
  const applicability = typeResistBerryApplicabilityCanonical({ user, target, move, context });
  const hit = context?.hit === true || Number(damageDealt ?? 0) > 0;
  const triggered = applicability.eligible && hit;
  return Object.freeze({
    boundary: "action_after",
    ...applicability,
    hit,
    triggered,
    damageMultiplier: applicability.eligible ? (applicability.ripen ? 0.25 : 0.5) : 1,
    consumeRequest: triggered
      ? Object.freeze({
          item: applicability.item,
          itemIsBerry: true,
          effectKind: "type_resist",
          permanent: true,
        })
      : null,
  });
}

export const BATTLE_TYPE_RESIST_BERRY_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze([]),
  abilityCount: 0,
  itemIds: Object.freeze(Object.keys(TYPE_RESIST_BERRY_BY_ITEM).sort()),
  itemCount: Object.keys(TYPE_RESIST_BERRY_BY_ITEM).length,
  classificationCounts: Object.freeze({
    superEffectiveTypeResistBerries: 17,
    normalTypeResistBerries: 1,
    typeResistBerries: 18,
  }),
});
