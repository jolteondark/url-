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

const MOVE_LAST_HELD_ITEMS = new Set(["FULLINCENSE", "LAGGINGTAIL"]);

export const BATTLE_MOVE_ORDER_EXTENSION_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze(["STALL"]),
  itemIds: Object.freeze([...MOVE_LAST_HELD_ITEMS].sort()),
  abilityCount: 1,
  itemCount: MOVE_LAST_HELD_ITEMS.size,
  classificationCounts: Object.freeze({
    moveLastWithinPriorityAbilities: 1,
    moveLastWithinPriorityHeldItems: MOVE_LAST_HELD_ITEMS.size,
  }),
});

export function resolveMoveOrderAbilityItemExtensionCanonical({ user = {}, move = {} } = {}) {
  const ability = abilityId(user);
  const heldItem = heldItemId(user);
  const itemEffectsSuppressed = user?.held_item_effect_suppressed === true;
  const itemForcesLast = !itemEffectsSuppressed && MOVE_LAST_HELD_ITEMS.has(heldItem);
  const stallForcesLast = ability === "STALL";
  const movePriorityRaw = Number(move?.priority ?? 0);
  const movePriority = Number.isFinite(movePriorityRaw) ? movePriorityRaw : 0;

  // Gen V onward: Stall, Lagging Tail and Full Incense all occupy the same
  // "move last" precedence class within the move's existing priority bracket.
  // The held-item source wins only for provenance when both are present.
  const source = itemForcesLast ? heldItem : (stallForcesLast ? "STALL" : null);
  return Object.freeze({
    boundary: "action_before",
    forceLastWithinPriority: source !== null,
    source,
    movePriority,
    priorityDelta: 0,
  });
}
