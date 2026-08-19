const id = (value) => String(value ?? "").toUpperCase();

const MOLD_BREAKER_ABILITIES = new Set(["MOLDBREAKER", "TERAVOLT", "TURBOBLAZE"]);
const WEATHER_SPEED_ABILITIES = Object.freeze({
  CHLOROPHYLL: new Set(["Sun", "HarshSun"]),
  SWIFTSWIM: new Set(["Rain", "HeavyRain"]),
  SANDRUSH: new Set(["Sandstorm"]),
  SLUSHRUSH: new Set(["Hail", "Snow"]),
});

const TYPE_BOOST_ITEMS = Object.freeze({
  NORMAL: "SILKSCARF",
  FIRE: "CHARCOAL",
  WATER: "MYSTICWATER",
  ELECTRIC: "MAGNET",
  GRASS: "MIRACLESEED",
  ICE: "NEVERMELTICE",
  FIGHTING: "BLACKBELT",
  POISON: "POISONBARB",
  GROUND: "SOFTSAND",
  FLYING: "SHARPBEAK",
  PSYCHIC: "TWISTEDSPOON",
  BUG: "SILVERPOWDER",
  ROCK: "HARDSTONE",
  GHOST: "SPELLTAG",
  DRAGON: "DRAGONFANG",
  DARK: "BLACKGLASSES",
  STEEL: "METALCOAT",
  FAIRY: "FAIRYFEATHER",
});
const MOLD_BREAKER_SUPER_EFFECTIVE_REDUCTION_ABILITIES = new Set(["FILTER", "SOLIDROCK"]);
const UNBYPASSABLE_SUPER_EFFECTIVE_REDUCTION_ABILITIES = new Set(["PRISMARMOR"]);

const EXTENSION_ABILITY_IDS = Object.freeze([
  "CHLOROPHYLL",
  "FILTER",
  "PRANKSTER",
  "PRISMARMOR",
  "SANDFORCE",
  "SANDRUSH",
  "SLUSHRUSH",
  "SNIPER",
  "SOLIDROCK",
  "SOLARPOWER",
  "SUPERLUCK",
  "SWIFTSWIM",
  "TINTEDLENS",
  "UNAWARE",
  "VICTORYSTAR",
]);

const EXTENSION_ITEM_IDS = Object.freeze([
  "ASSAULTVEST",
  "BRIGHTPOWDER",
  "EXPERTBELT",
  "LAXINCENSE",
  "RAZORCLAW",
  "SCOPELENS",
  ...Object.values(TYPE_BOOST_ITEMS),
].sort());

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
  const moveType = id(move?.type);
  const typeMod = Number(context?.typeMod ?? context?.type_mod ?? 1);
  const critical = Boolean(context?.critical);

  const pranksterPriority = userAbility === "PRANKSTER" && category === "Status" ? 1 : 0;
  const criticalStageDelta = (userAbility === "SUPERLUCK" ? 1 : 0)
    + (["SCOPELENS", "RAZORCLAW"].includes(userItem) ? 1 : 0);
  const assaultVestBlocksMove = userItem === "ASSAULTVEST" && category === "Status";
  const assaultVestDefenseMultiplier = targetItem === "ASSAULTVEST" && category === "Special" ? 1.5 : 1;
  let accuracyMultiplier = userAbility === "VICTORYSTAR" ? 1.1 : 1;
  if (["BRIGHTPOWDER", "LAXINCENSE"].includes(targetItem)) accuracyMultiplier *= 0.9;
  const weatherSpeedMultiplier = WEATHER_SPEED_ABILITIES[userAbility]?.has(weather) ? 2 : 1;
  const solarPowerAttackMultiplier = userAbility === "SOLARPOWER"
    && category === "Special"
    && ["Sun", "HarshSun"].includes(weather) ? 1.5 : 1;
  const moldBreaker = MOLD_BREAKER_ABILITIES.has(userAbility);

  let powerMultiplier = 1;
  if (weather === "Sandstorm" && userAbility === "SANDFORCE" && ["ROCK", "GROUND", "STEEL"].includes(moveType)) {
    powerMultiplier *= 1.3;
  }
  if (TYPE_BOOST_ITEMS[moveType] === userItem) powerMultiplier *= 1.2;

  let finalDamageMultiplier = 1;
  if (userAbility === "TINTEDLENS" && typeMod > 0 && typeMod < 1) finalDamageMultiplier *= 2;
  if (userItem === "EXPERTBELT" && typeMod > 1) finalDamageMultiplier *= 1.2;
  if (typeMod > 1 && (
    (MOLD_BREAKER_SUPER_EFFECTIVE_REDUCTION_ABILITIES.has(targetAbility) && !moldBreaker)
    || UNBYPASSABLE_SUPER_EFFECTIVE_REDUCTION_ABILITIES.has(targetAbility)
  )) finalDamageMultiplier *= 0.75;
  if (userAbility === "SNIPER" && critical) finalDamageMultiplier *= 1.5;
  if (targetAbility === "DRYSKIN" && moveType === "FIRE" && !moldBreaker) finalDamageMultiplier *= 1.25;

  return Object.freeze({
    priorityModifier: pranksterPriority,
    criticalStageDelta,
    moveSelection: Object.freeze({
      blocked: assaultVestBlocksMove,
      reason: assaultVestBlocksMove ? "assault_vest_status_move" : null,
    }),
    damageMultiplierInput: Object.freeze({
      externalPowerMultiplier: powerMultiplier,
      externalAttackMultiplier: solarPowerAttackMultiplier,
      externalDefenseMultiplier: assaultVestDefenseMultiplier,
      externalFinalDamageMultiplier: finalDamageMultiplier,
    }),
    accuracyModifierInput: Object.freeze({
      externalAccuracyMultiplier: accuracyMultiplier,
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
    weatherPowerModifier: 1,
    typeBoostHeldItems: Object.keys(TYPE_BOOST_ITEMS).length,
    superEffectiveOffenseModifier: 2,
    superEffectiveDefenseModifier: MOLD_BREAKER_SUPER_EFFECTIVE_REDUCTION_ABILITIES.size + UNBYPASSABLE_SUPER_EFFECTIVE_REDUCTION_ABILITIES.size,
    criticalDamageModifier: 1,
    targetAccuracyHeldItems: 2,
    typeWeaknessAbilityModifier: 1,
  }),
});
