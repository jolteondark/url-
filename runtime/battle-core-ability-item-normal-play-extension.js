const id = (value) => String(value ?? "").toUpperCase();

const MOLD_BREAKER_ABILITIES = new Set(["MOLDBREAKER", "TERAVOLT", "TURBOBLAZE"]);
const WEATHER_SPEED_ABILITIES = Object.freeze({
  CHLOROPHYLL: new Set(["Sun", "HarshSun"]),
  SWIFTSWIM: new Set(["Rain", "HeavyRain"]),
  SANDRUSH: new Set(["Sandstorm"]),
  SLUSHRUSH: new Set(["Hail", "Snow"]),
});

const EXTENSION_ABILITY_IDS = Object.freeze([
  "CHLOROPHYLL",
  "PRANKSTER",
  "SANDRUSH",
  "SLUSHRUSH",
  "SOLARPOWER",
  "SUPERLUCK",
  "SWIFTSWIM",
  "UNAWARE",
  "VICTORYSTAR",
]);

const EXTENSION_ITEM_IDS = Object.freeze([
  "ASSAULTVEST",
  "RAZORCLAW",
  "SCOPELENS",
]);

function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

function moveCategory(move) {
  const category = String(move?.category ?? "").toLowerCase();
  if (category === "status") return "Status";
  if (category === "special") return "Special";
  if (category === "physical") return "Physical";
  return null;
}

function abilityId(pokemon) {
  if (hasOwn(pokemon, "ability")) return id(pokemon.ability);
  return id(pokemon?.ability_id);
}

function itemId(pokemon) {
  if (hasOwn(pokemon, "held_item")) return id(pokemon.held_item);
  return id(pokemon?.item);
}

function weatherId(context) {
  return String(context?.effectiveWeather ?? context?.weather ?? "");
}

export function resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({ user = {}, target = {}, move = {}, context = {} } = {}) {
  const userAbility = abilityId(user);
  const targetAbility = abilityId(target);
  const userItem = itemId(user);
  const targetItem = itemId(target);
  const category = moveCategory(move);
  const weather = weatherId(context);

  const pranksterPriority = userAbility === "PRANKSTER" && category === "Status" ? 1 : 0;
  const criticalStageDelta = (userAbility === "SUPERLUCK" ? 1 : 0)
    + (["SCOPELENS", "RAZORCLAW"].includes(userItem) ? 1 : 0);
  const assaultVestBlocksMove = userItem === "ASSAULTVEST" && category === "Status";
  const assaultVestDefenseMultiplier = targetItem === "ASSAULTVEST" && category === "Special" ? 1.5 : 1;
  const victoryStarAccuracyMultiplier = userAbility === "VICTORYSTAR" ? 1.1 : 1;
  const weatherSpeedMultiplier = WEATHER_SPEED_ABILITIES[userAbility]?.has(weather) ? 2 : 1;
  const solarPowerAttackMultiplier = userAbility === "SOLARPOWER"
    && category === "Special"
    && ["Sun", "HarshSun"].includes(weather) ? 1.5 : 1;
  const moldBreaker = MOLD_BREAKER_ABILITIES.has(userAbility);

  return Object.freeze({
    priorityModifier: pranksterPriority,
    criticalStageDelta,
    moveSelection: Object.freeze({
      blocked: assaultVestBlocksMove,
      reason: assaultVestBlocksMove ? "assault_vest_status_move" : null,
    }),
    damageMultiplierInput: Object.freeze({
      externalAttackMultiplier: solarPowerAttackMultiplier,
      externalDefenseMultiplier: assaultVestDefenseMultiplier,
    }),
    accuracyModifierInput: Object.freeze({
      externalAccuracyMultiplier: victoryStarAccuracyMultiplier,
    }),
    speedInput: Object.freeze({
      abilityMultiplier: weatherSpeedMultiplier,
    }),
    damageCalculationInput: Object.freeze({
      userUnaware: userAbility === "UNAWARE",
      targetUnaware: targetAbility === "UNAWARE" && !moldBreaker,
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
    accuracyModifier: 1,
    weatherSpeedModifier: 4,
    weatherSpecialAttackModifier: 1,
    statStageIgnore: 1,
  }),
});
