const id = (value) => String(value ?? "").toUpperCase();

const EXTENSION_ABILITY_IDS = Object.freeze([
  "PRANKSTER",
  "SUPERLUCK",
]);

const EXTENSION_ITEM_IDS = Object.freeze([
  "ASSAULTVEST",
  "RAZORCLAW",
  "SCOPELENS",
]);

function moveCategory(move) {
  const category = String(move?.category ?? "").toLowerCase();
  if (category === "status") return "Status";
  if (category === "special") return "Special";
  if (category === "physical") return "Physical";
  return null;
}

function abilityId(pokemon) {
  return id(pokemon?.ability_id ?? pokemon?.ability);
}

function itemId(pokemon) {
  return id(pokemon?.item ?? pokemon?.held_item);
}

export function resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({ user = {}, target = {}, move = {} } = {}) {
  const userAbility = abilityId(user);
  const userItem = itemId(user);
  const targetItem = itemId(target);
  const category = moveCategory(move);

  const pranksterPriority = userAbility === "PRANKSTER" && category === "Status" ? 1 : 0;
  const criticalStageDelta = (userAbility === "SUPERLUCK" ? 1 : 0)
    + (["SCOPELENS", "RAZORCLAW"].includes(userItem) ? 1 : 0);
  const assaultVestBlocksMove = userItem === "ASSAULTVEST" && category === "Status";
  const assaultVestDefenseMultiplier = targetItem === "ASSAULTVEST" && category === "Special" ? 1.5 : 1;

  return Object.freeze({
    priorityModifier: pranksterPriority,
    criticalStageDelta,
    moveSelection: Object.freeze({
      blocked: assaultVestBlocksMove,
      reason: assaultVestBlocksMove ? "assault_vest_status_move" : null,
    }),
    damageMultiplierInput: Object.freeze({
      externalDefenseMultiplier: assaultVestDefenseMultiplier,
    }),
  });
}

export const BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: EXTENSION_ABILITY_IDS,
  itemIds: EXTENSION_ITEM_IDS,
  abilityCount: EXTENSION_ABILITY_IDS.length,
  itemCount: EXTENSION_ITEM_IDS.length,
  classificationCounts: Object.freeze({
    movePriority: 1,
    criticalStage: 3,
    moveSelectionRestriction: 1,
    specialDefenseModifier: 1,
  }),
});
