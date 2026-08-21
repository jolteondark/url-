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
  const damagingMove = moveCategory !== "STATUS";

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

  let source = null;
  if (abilitySubPriority > 0) source = "QUICKDRAW";
  else if (itemSubPriority > 0) source = quickClawTriggered ? "QUICKCLAW" : "CUSTAPBERRY";
  else if (itemSubPriority < 0) source = heldItem;
  else if (abilitySubPriority < 0) source = myceliumMightForcesLast ? "MYCELIUMMIGHT" : "STALL";

  const consumeRequest = custapTriggered
    ? Object.freeze({ item: "CUSTAPBERRY", permanent: true, reason: "move_first_within_priority" })
    : null;

  return Object.freeze({
    boundary: "action_before",
    forceFirstWithinPriority: abilitySubPriority > 0 || itemSubPriority > 0,
    forceLastWithinPriority: abilitySubPriority < 0 || itemSubPriority < 0,
    source,
    abilitySubPriority,
    itemSubPriority,
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
