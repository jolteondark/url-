import { resolveBattleStatDropReactionCanonical } from "./battle-core-stat-drop-reaction.js";

const INTIMIDATE_EXISTING_EFFECT_IMMUNITIES = new Set([
  "INNERFOCUS",
  "OBLIVIOUS",
  "OWNTEMPO",
  "SCRAPPY",
]);
const INTIMIDATE_REACTIVE_ABILITIES = new Set([
  "GUARDDOG",
  "RATTLED",
]);
const INTIMIDATE_REACTIVE_ITEMS = new Set(["ADRENALINEORB"]);

function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

function canonicalId(value) {
  const raw = typeof value === "string" ? value : value?.id;
  return String(raw ?? "").toUpperCase();
}

function abilityId(pokemon) {
  if (hasOwn(pokemon, "ability")) return canonicalId(pokemon.ability);
  return canonicalId(pokemon?.ability_id);
}

function heldItemId(pokemon) {
  if (hasOwn(pokemon, "held_item")) return canonicalId(pokemon.held_item);
  return canonicalId(pokemon?.item);
}

function statChange(stat, delta, subject = "target") {
  return Object.freeze({ subject, stat, delta });
}

function consumeRequest(item, effectKind) {
  return Object.freeze({ item, itemIsBerry: false, effectKind, permanent: true });
}

export function resolveIntimidateEntryReactionCanonical({ source = {}, target = {} } = {}) {
  const sourceAbility = abilityId(source);
  const targetAbility = abilityId(target);
  const targetItem = heldItemId(target);
  if (sourceAbility !== "INTIMIDATE") {
    return Object.freeze({
      applies: false,
      sourceAbility,
      targetAbility,
      targetItem,
      blocksAttackDrop: false,
      replaceBaseChanges: false,
      changes: Object.freeze([]),
      consumeRequest: null,
      reason: "not_intimidate",
    });
  }

  if (INTIMIDATE_EXISTING_EFFECT_IMMUNITIES.has(targetAbility)) {
    return Object.freeze({
      applies: true,
      sourceAbility,
      targetAbility,
      targetItem,
      blocksAttackDrop: true,
      replaceBaseChanges: true,
      changes: Object.freeze([]),
      consumeRequest: null,
      reason: "intimidate_effect_immunity",
    });
  }

  if (targetAbility === "GUARDDOG") {
    return Object.freeze({
      applies: true,
      sourceAbility,
      targetAbility,
      targetItem,
      blocksAttackDrop: true,
      replaceBaseChanges: true,
      changes: Object.freeze([statChange("ATTACK", 1)]),
      consumeRequest: null,
      reason: "guard_dog",
    });
  }

  const sharedReaction = resolveBattleStatDropReactionCanonical({
    source,
    target,
    changes: [statChange("ATTACK", -1)],
    causedByOpponent: true,
  });
  const baseDropApplied = sharedReaction.appliedChanges.some((change) =>
    change.subject === "target" && change.stat === "ATTACK" && change.delta < 0,
  );
  const changes = [...sharedReaction.reactionChanges];
  if (baseDropApplied && targetAbility === "RATTLED") changes.push(statChange("SPEED", 1));

  let itemConsumeRequest = null;
  if (baseDropApplied && targetItem === "ADRENALINEORB") {
    changes.push(statChange("SPEED", 1));
    itemConsumeRequest = consumeRequest(targetItem, "intimidate_speed_raise");
  }

  return Object.freeze({
    applies: true,
    sourceAbility,
    targetAbility,
    targetItem,
    blocksAttackDrop: !baseDropApplied,
    replaceBaseChanges: !baseDropApplied,
    changes: Object.freeze(changes),
    consumeRequest: itemConsumeRequest,
    reason: sharedReaction.reason === "no_stat_drop_reaction"
      ? (changes.length > 0 ? "intimidate_reaction" : "no_extension_reaction")
      : sharedReaction.reason,
    statDropReaction: sharedReaction,
  });
}

export const BATTLE_ABILITY_ITEM_ENTRY_EXTENSION_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze([...INTIMIDATE_REACTIVE_ABILITIES].sort()),
  itemIds: Object.freeze([...INTIMIDATE_REACTIVE_ITEMS].sort()),
  abilityCount: INTIMIDATE_REACTIVE_ABILITIES.size,
  itemCount: INTIMIDATE_REACTIVE_ITEMS.size,
  classificationCounts: Object.freeze({
    intimidateReactiveAbilities: INTIMIDATE_REACTIVE_ABILITIES.size,
    intimidateReactiveItems: INTIMIDATE_REACTIVE_ITEMS.size,
  }),
});
