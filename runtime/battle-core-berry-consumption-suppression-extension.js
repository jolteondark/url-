function canonicalId(value) {
  const raw = typeof value === "string" ? value : value?.id;
  return String(raw ?? "").toUpperCase();
}

function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

function abilityIdCanonical(pokemon) {
  if (hasOwn(pokemon, "ability")) return canonicalId(pokemon.ability);
  return canonicalId(pokemon?.ability_id);
}

function heldItemIdCanonical(pokemon) {
  if (hasOwn(pokemon, "held_item")) return canonicalId(pokemon.held_item);
  return canonicalId(pokemon?.item);
}

function isBerryId(item) {
  return Boolean(item) && item.endsWith("BERRY");
}

export const BATTLE_BERRY_CONSUMPTION_SUPPRESSION_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze(["UNNERVE"]),
  abilityCount: 1,
  itemIds: Object.freeze([]),
  itemCount: 0,
  classificationCounts: Object.freeze({ opposingBerryConsumptionBlockAbilities: 1 }),
});

export function resolveBerryConsumptionSuppressionCanonical({ consumer = {}, opposing = {}, context = {} } = {}) {
  const item = heldItemIdCanonical(consumer);
  const opposingAbility = abilityIdCanonical(opposing);
  const berry = isBerryId(item);
  const teatimeBypass = Boolean(context?.teatimeBypass ?? context?.ignoreUnnerveForTeatime);
  const blocked = berry && opposingAbility === "UNNERVE" && !teatimeBypass;
  return Object.freeze({
    boundary: "berry_consumption",
    item,
    opposingAbility,
    berry,
    blocked,
    source: blocked ? "UNNERVE" : null,
    teatimeBypass,
  });
}

export function applyBerryConsumptionSuppressionCanonical(resolution = {}, { consumer = {}, opposing = {}, context = {} } = {}) {
  const suppression = resolveBerryConsumptionSuppressionCanonical({ consumer, opposing, context });
  if (!suppression.blocked || resolution?.triggered !== true) {
    return Object.freeze({
      ...resolution,
      berryConsumptionSuppression: suppression,
      blockedByBerrySuppression: false,
    });
  }
  const next = {
    ...resolution,
    triggered: false,
    consumeRequest: null,
    berryConsumptionSuppression: suppression,
    blockedByBerrySuppression: true,
  };
  if (Object.prototype.hasOwnProperty.call(next, "heal")) next.heal = 0;
  if (Object.prototype.hasOwnProperty.call(next, "statChanges")) next.statChanges = Object.freeze([]);
  if (Object.prototype.hasOwnProperty.call(next, "statusCureRequest")) next.statusCureRequest = null;
  return Object.freeze(next);
}
