function canonicalId(value) {
  const raw = typeof value === "string" ? value : value?.id;
  return String(raw ?? "").trim().toUpperCase();
}

function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

function heldItemCanonical(pokemon) {
  if (hasOwn(pokemon, "held_item")) return canonicalId(pokemon.held_item);
  return canonicalId(pokemon?.item);
}

function abilityCanonical(pokemon) {
  if (hasOwn(pokemon, "ability")) return canonicalId(pokemon.ability);
  return canonicalId(pokemon?.ability_id);
}

function moveCategoryCanonical(move) {
  const category = String(move?.category ?? "").trim().toLowerCase();
  if (category === "physical") return "Physical";
  if (category === "special") return "Special";
  if (category === "status") return "Status";
  return null;
}

function heldItemEffectSuppressedCanonical(target, context) {
  if (abilityCanonical(target) === "KLUTZ") return true;
  return Boolean(
    context?.heldItemEffectSuppressed
    ?? context?.targetHeldItemEffectSuppressed
    ?? context?.targetItemSuppressed
    ?? context?.magicRoom
    ?? context?.targetEmbargoed
    ?? false
  );
}

export const BATTLE_EVIOLITE_DEFENSE_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze([]),
  itemIds: Object.freeze(["EVIOLITE"]),
  abilityCount: 0,
  itemCount: 1,
  classificationCounts: Object.freeze({
    evolutionConditionalDefenseHeldItems: 1,
  }),
});

export function resolveEvioliteDefenseModifierCanonical({ target = {}, move = {}, context = {} } = {}) {
  const item = heldItemCanonical(target);
  const category = moveCategoryCanonical(move);
  const canEvolve = context?.targetCanEvolve === true;
  const itemSuppressed = heldItemEffectSuppressedCanonical(target, context);
  const appliesTo = category === "Physical"
    ? "DEFENSE"
    : (category === "Special" ? "SPECIAL_DEFENSE" : null);
  const triggered = item === "EVIOLITE" && canEvolve && !itemSuppressed && appliesTo !== null;

  return Object.freeze({
    boundary: "action_before",
    item,
    triggered,
    targetCanEvolve: canEvolve,
    itemSuppressed,
    appliesTo,
    externalDefenseMultiplier: triggered ? 1.5 : 1,
    source: triggered ? "EVIOLITE" : null,
  });
}
