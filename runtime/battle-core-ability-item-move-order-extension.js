function canonicalId(value) {
  if (value && typeof value === "object") {
    return String(value.id ?? value.ID ?? value.name ?? "").trim().toUpperCase();
  }
  return String(value ?? "").trim().toUpperCase();
}

function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

function abilityId(pokemon) {
  if (hasOwn(pokemon, "ability")) return canonicalId(pokemon.ability);
  return canonicalId(pokemon?.ability_id);
}

function heldItemId(pokemon) {
  if (hasOwn(pokemon, "held_item")) return canonicalId(pokemon.held_item);
  return canonicalId(pokemon?.item);
}

function normalizedPercentRoll(value, label) {
  if (value === null || value === undefined) return null;
  const roll = Number(value);
  if (!Number.isInteger(roll) || roll < 0 || roll >= 100) {
    throw new RangeError(`${label} must be an integer in [0, 99]`);
  }
  return roll;
}

function hpFractionAtMost(pokemon, numerator, denominator) {
  const hp = Math.max(0, Math.trunc(Number(pokemon?.hp ?? 0)));
  const maxHp = Math.max(1, Math.trunc(Number(pokemon?.max_hp ?? pokemon?.maxHp ?? 1)));
  return hp > 0 && hp * denominator <= maxHp * numerator;
}

function effectiveSubPriorityCanonical(abilitySubPriority, itemSubPriority) {
  let subPriority = Number(abilitySubPriority ?? 0);
  const item = Number(itemSubPriority ?? 0);
  if ((subPriority === 0 && item !== 0) || (subPriority < 0 && item >= 1)) subPriority = item;
  return subPriority;
}

const MOVE_LAST_HELD_ITEMS = new Set(["FULLINCENSE", "LAGGINGTAIL"]);
const MOVE_LAST_ABILITIES = new Set(["MYCELIUMMIGHT", "STALL"]);
const MOVE_FIRST_HELD_ITEMS = new Set(["CUSTAPBERRY", "QUICKCLAW"]);
const MOVE_FIRST_ABILITIES = new Set(["QUICKDRAW"]);

export const BATTLE_MOVE_ORDER_EXTENSION_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze([...new Set([...MOVE_LAST_ABILITIES, ...MOVE_FIRST_ABILITIES])].sort()),
  itemIds: Object.freeze([...new Set([...MOVE_LAST_HELD_ITEMS, ...MOVE_FIRST_HELD_ITEMS])].sort()),
  abilityCount: MOVE_LAST_ABILITIES.size + MOVE_FIRST_ABILITIES.size,
  itemCount: MOVE_LAST_HELD_ITEMS.size + MOVE_FIRST_HELD_ITEMS.size,
  classificationCounts: Object.freeze({
    moveLastWithinPriorityAbilities: MOVE_LAST_ABILITIES.size,
    moveLastWithinPriorityHeldItems: MOVE_LAST_HELD_ITEMS.size,
    probabilisticMoveFirstAbilities: MOVE_FIRST_ABILITIES.size,
    probabilisticMoveFirstHeldItems: 1,
    pinchMoveFirstBerries: 1,
  }),
});

export function resolveMoveOrderAbilityItemExtensionCanonical({
  user = {},
  move = {},
  abilityRandomRoll = null,
  itemRandomRoll = null,
  opposingHasUnnerve = false,
} = {}) {
  const ability = abilityId(user);
  const heldItem = heldItemId(user);
  const itemEffectsSuppressed = user?.held_item_effect_suppressed === true;
  const abilityRoll = normalizedPercentRoll(abilityRandomRoll, "abilityRandomRoll");
  const itemRoll = normalizedPercentRoll(itemRandomRoll, "itemRandomRoll");
  const movePriorityRaw = Number(move?.priority ?? 0);
  const movePriority = Number.isFinite(movePriorityRaw) ? movePriorityRaw : 0;
  const moveCategory = canonicalId(move?.category);
  const damagingMove = moveCategory === "PHYSICAL" || moveCategory === "SPECIAL";

  const quickDrawEligible = ability === "QUICKDRAW" && damagingMove;
  const quickDrawTriggered = quickDrawEligible && abilityRoll !== null && abilityRoll < 30;
  const myceliumMightForcesLast = ability === "MYCELIUMMIGHT" && moveCategory === "STATUS";
  const stallForcesLast = ability === "STALL";
  const abilitySubPriority = quickDrawTriggered ? 1 : ((stallForcesLast || myceliumMightForcesLast) ? -1 : 0);

  const itemAvailable = !itemEffectsSuppressed;
  const quickClawEligible = itemAvailable && heldItem === "QUICKCLAW" && !quickDrawTriggered;
  const quickClawTriggered = quickClawEligible && itemRoll !== null && itemRoll < 20;
  const gluttony = ability === "GLUTTONY";
  const custapHpEligible = gluttony ? hpFractionAtMost(user, 1, 2) : hpFractionAtMost(user, 1, 4);
  const custapTriggered = itemAvailable
    && heldItem === "CUSTAPBERRY"
    && !quickDrawTriggered
    && !Boolean(opposingHasUnnerve)
    && custapHpEligible;
  const itemForcesLast = itemAvailable && MOVE_LAST_HELD_ITEMS.has(heldItem);
  const itemSubPriority = (quickClawTriggered || custapTriggered) ? 1 : (itemForcesLast ? -1 : 0);
  const effectiveSubPriority = effectiveSubPriorityCanonical(abilitySubPriority, itemSubPriority);

  let source = null;
  if (effectiveSubPriority > 0) {
    source = abilitySubPriority > 0 ? "QUICKDRAW" : (quickClawTriggered ? "QUICKCLAW" : "CUSTAPBERRY");
  } else if (effectiveSubPriority < 0) {
    source = abilitySubPriority < 0 ? (myceliumMightForcesLast ? "MYCELIUMMIGHT" : "STALL") : heldItem;
  }

  const consumeRequest = custapTriggered
    ? Object.freeze({ item: "CUSTAPBERRY", permanent: true, reason: "move_first_within_priority" })
    : null;

  return Object.freeze({
    boundary: "action_before",
    forceFirstWithinPriority: effectiveSubPriority > 0,
    forceLastWithinPriority: effectiveSubPriority < 0,
    source,
    abilitySubPriority,
    itemSubPriority,
    effectiveSubPriority,
    movePriority,
    priorityDelta: 0,
    abilityChanceRequest: quickDrawEligible
      ? Object.freeze({ numerator: 30, denominator: 100, roll: abilityRoll, source: "QUICKDRAW" })
      : null,
    itemChanceRequest: quickClawEligible
      ? Object.freeze({ numerator: 20, denominator: 100, roll: itemRoll, source: "QUICKCLAW" })
      : null,
    consumeRequest,
  });
}
