// Canonical move masters required by the DAY18 CUSTOM egg stock but absent
// from the GENERAL-only Safari encounter payload.
export const MAPLESS_EGG_SHOP_CUSTOM_MOVE_MASTERS_V108 = Object.freeze({
  PSYWAVE: Object.freeze({
    id: "PSYWAVE",
    name: "Psywave",
    type: "PSYCHIC",
    category: "Special",
    power: 1,
    accuracy: 100,
    total_pp: 15,
    priority: 0,
    function_code: "FixedDamageUserLevelRandom",
    effect_chance: 0,
    thaws_user: false,
  }),
  MIRACLEEYE: Object.freeze({
    id: "MIRACLEEYE",
    name: "Miracle Eye",
    type: "PSYCHIC",
    category: "Status",
    power: 0,
    accuracy: 0,
    total_pp: 40,
    priority: 0,
    function_code: "StartNegateTargetEvasionStatStageAndDarkImmunity",
    effect_chance: 0,
    thaws_user: false,
  }),
});

export function installMaplessEggShopCustomMoveMastersV108(target) {
  if (!target || typeof target !== "object" || Array.isArray(target)) throw new TypeError("move master target is required");
  for (const [id, master] of Object.entries(MAPLESS_EGG_SHOP_CUSTOM_MOVE_MASTERS_V108)) target[id] = master;
  return Object.keys(MAPLESS_EGG_SHOP_CUSTOM_MOVE_MASTERS_V108).length;
}
