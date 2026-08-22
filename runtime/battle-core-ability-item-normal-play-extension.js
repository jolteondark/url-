import {
  BATTLE_TYPE_RESIST_BERRY_COVERAGE_CANONICAL,
  resolveTypeResistBerryActionBeforeCanonical,
} from "./battle-core-type-resist-berry-extension.js";

const id = (value) => String(value ?? "").toUpperCase();

const MOLD_BREAKER_ABILITIES = new Set(["MOLDBREAKER", "TERAVOLT", "TURBOBLAZE"]);
const PRIORITY_BLOCK_ABILITIES = new Set(["ARMORTAIL", "DAZZLING", "QUEENLYMAJESTY"]);
const CRITICAL_HIT_PREVENTION_ABILITIES = new Set(["BATTLEARMOR", "SHELLARMOR"]);
const WEATHER_SPEED_ABILITIES = Object.freeze({
  CHLOROPHYLL: new Set(["Sun", "HarshSun"]),
  SWIFTSWIM: new Set(["Rain", "HeavyRain"]),
  SANDRUSH: new Set(["Sandstorm"]),
  SLUSHRUSH: new Set(["Hail", "Snow"]),
});
const WEATHER_EVASION_ABILITIES = Object.freeze({
  SANDVEIL: new Set(["Sandstorm"]),
  SNOWCLOAK: new Set(["Hail", "Snow"]),
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
const ABILITY_TYPE_POWER_BOOSTS = Object.freeze({
  STEELWORKER: Object.freeze({ type: "STEEL", multiplier: 1.5 }),
  DRAGONSMAW: Object.freeze({ type: "DRAGON", multiplier: 1.5 }),
  ROCKYPAYLOAD: Object.freeze({ type: "ROCK", multiplier: 1.5 }),
  TRANSISTOR: Object.freeze({ type: "ELECTRIC", multiplier: 1.3 }),
});
const MOLD_BREAKER_SUPER_EFFECTIVE_REDUCTION_ABILITIES = new Set(["FILTER", "SOLIDROCK"]);
const UNBYPASSABLE_SUPER_EFFECTIVE_REDUCTION_ABILITIES = new Set(["PRISMARMOR"]);
const FULL_HP_DAMAGE_REDUCTION_ABILITIES = Object.freeze({
  MULTISCALE: Object.freeze({ bypassedByMoldBreaker: true }),
  SHADOWSHIELD: Object.freeze({ bypassedByMoldBreaker: false }),
});
const SPECIES_SPECIFIC_STAT_ITEMS = Object.freeze([
  "LIGHTBALL",
  "THICKCLUB",
  "DEEPSEATOOTH",
  "DEEPSEASCALE",
]);

const EXTENSION_ABILITY_IDS = Object.freeze([
  "ARMORTAIL",
  "BATTLEARMOR",
  "CHLOROPHYLL",
  "DAZZLING",
  "DEFEATIST",
  "DRAGONSMAW",
  "FILTER",
  "FLAREBOOST",
  "FLUFFY",
  "MARVELSCALE",
  "MULTISCALE",
  "NEUROFORCE",
  "PRANKSTER",
  "PRISMARMOR",
  "PURIFYINGSALT",
  "QUEENLYMAJESTY",
  "RIVALRY",
  "ROCKYPAYLOAD",
  "SANDFORCE",
  "SANDRUSH",
  "SANDVEIL",
  "SHADOWSHIELD",
  "SHELLARMOR",
  "SLUSHRUSH",
  "SNIPER",
  "SNOWCLOAK",
  "SOLARPOWER",
  "SOLIDROCK",
  "STEELWORKER",
  "SUPERLUCK",
  "SWIFTSWIM",
  "TINTEDLENS",
  "TOXICBOOST",
  "TRANSISTOR",
  "UNAWARE",
  "VICTORYSTAR",
]);

const EXTENSION_ITEM_IDS = Object.freeze([
  "ASSAULTVEST",
  "BRIGHTPOWDER",
  "COVERTCLOAK",
  "EXPERTBELT",
  "LAXINCENSE",
  "MUSCLEBAND",
  "RAZORCLAW",
  "SCOPELENS",
  "WISEGLASSES",
  ...Object.values(TYPE_BOOST_ITEMS),
  ...SPECIES_SPECIFIC_STAT_ITEMS,
  ...BATTLE_TYPE_RESIST_BERRY_COVERAGE_CANONICAL.itemIds,
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

function speciesId(pokemon) {
  return id(pokemon?.species);
}

function genderId(pokemon) {
  const value = pokemon?.gender;
  if (value === 0 || ["M", "MALE"].includes(id(value))) return "MALE";
  if (value === 1 || ["F", "FEMALE"].includes(id(value))) return "FEMALE";
  return null;
}

function weatherId(context) {
  return String(context?.effectiveWeather ?? context?.weather ?? "");
}

function moveMakesContactCanonical(move, context, userAbility) {
  const raw = typeof context?.contact === "boolean"
    ? context.contact
    : (typeof move?.contact === "boolean"
      ? move.contact
      : (typeof move?.makes_contact === "boolean" ? move.makes_contact : Boolean(move?.makesContact)));
  return raw && userAbility !== "LONGREACH";
}

function pokemonAtFullHp(pokemon) {
  const hp = Number(pokemon?.hp ?? 0);
  const maxHp = Number(pokemon?.max_hp ?? pokemon?.maxHp ?? 0);
  return Number.isFinite(hp) && Number.isFinite(maxHp) && maxHp > 0 && hp === maxHp;
}

function pokemonAtOrBelowHalfHp(pokemon) {
  const hp = Number(pokemon?.hp ?? 0);
  const maxHp = Number(pokemon?.max_hp ?? pokemon?.maxHp ?? 0);
  return Number.isFinite(hp) && Number.isFinite(maxHp) && hp > 0 && maxHp > 0 && hp * 2 <= maxHp;
}

export function resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({ user = {}, target = {}, move = {}, context = {} } = {}) {
  const userAbility = abilityId(user);
  const targetAbility = abilityId(target);
  const userItem = itemId(user);
  const targetItem = itemId(target);
  const userSpecies = speciesId(user);
  const targetSpecies = speciesId(target);
  const userGender = genderId(user);
  const targetGender = genderId(target);
  const category = moveCategory(move);
  const weather = weatherId(context);
  const moveType = id(move?.type);
  const typeMod = Number(context?.typeMod ?? context?.type_mod ?? 1);
  const critical = Boolean(context?.critical);
  const userStatus = id(user?.status ?? "NONE");
  const targetStatus = id(target?.status ?? "NONE");
  const targetTypeResistBerry = resolveTypeResistBerryActionBeforeCanonical({ user, target, move, context });

  const pranksterPriority = userAbility === "PRANKSTER" && category === "Status" ? 1 : 0;
  const moldBreaker = MOLD_BREAKER_ABILITIES.has(userAbility);
  const effectivePriority = Number(context?.effectivePriority ?? context?.priority ?? (Number(move?.priority ?? 0) + pranksterPriority));
  const targetsOpponent = context?.targetsOpponent !== false;
  const priorityAbilityBlocksMove = Number.isFinite(effectivePriority)
    && effectivePriority > 0
    && targetsOpponent
    && PRIORITY_BLOCK_ABILITIES.has(targetAbility)
    && !moldBreaker;
  const criticalStageDelta = (userAbility === "SUPERLUCK" ? 1 : 0)
    + (["SCOPELENS", "RAZORCLAW"].includes(userItem) ? 1 : 0);
  const criticalHitBlocked = CRITICAL_HIT_PREVENTION_ABILITIES.has(targetAbility) && !moldBreaker;
  const criticalHitPrevention = Object.freeze({
    blocked: criticalHitBlocked,
    targetAbility: CRITICAL_HIT_PREVENTION_ABILITIES.has(targetAbility) ? targetAbility : null,
    moldBreaker,
  });
  const assaultVestBlocksMove = userItem === "ASSAULTVEST" && category === "Status";
  const moveSelectionBlocked = assaultVestBlocksMove || priorityAbilityBlocksMove;
  const moveSelectionReason = assaultVestBlocksMove
    ? "assault_vest_status_move"
    : (priorityAbilityBlocksMove ? "target_priority_block_ability" : null);
  const assaultVestDefenseMultiplier = targetItem === "ASSAULTVEST" && category === "Special" ? 1.5 : 1;
  const deepSeaScaleDefenseMultiplier = targetItem === "DEEPSEASCALE"
    && targetSpecies === "CLAMPERL"
    && category === "Special" ? 2 : 1;
  const marvelScaleDefenseMultiplier = targetAbility === "MARVELSCALE"
    && category === "Physical"
    && targetStatus !== "NONE"
    && !moldBreaker ? 1.5 : 1;
  const defenseMultiplier = assaultVestDefenseMultiplier * deepSeaScaleDefenseMultiplier * marvelScaleDefenseMultiplier;
  let accuracyMultiplier = userAbility === "VICTORYSTAR" ? 1.1 : 1;
  if (["BRIGHTPOWDER", "LAXINCENSE"].includes(targetItem)) accuracyMultiplier *= 0.9;
  if (WEATHER_EVASION_ABILITIES[targetAbility]?.has(weather) && !moldBreaker) accuracyMultiplier *= 0.8;
  const weatherSpeedMultiplier = WEATHER_SPEED_ABILITIES[userAbility]?.has(weather) ? 2 : 1;
  const solarPowerAttackMultiplier = userAbility === "SOLARPOWER"
    && category === "Special"
    && ["Sun", "HarshSun"].includes(weather) ? 1.5 : 1;
  const defeatistAttackMultiplier = userAbility === "DEFEATIST"
    && ["Physical", "Special"].includes(category)
    && pokemonAtOrBelowHalfHp(user) ? 0.5 : 1;
  let speciesHeldItemAttackMultiplier = 1;
  if (userItem === "LIGHTBALL" && userSpecies === "PIKACHU" && ["Physical", "Special"].includes(category)) {
    speciesHeldItemAttackMultiplier *= 2;
  }
  if (userItem === "THICKCLUB" && ["CUBONE", "MAROWAK"].includes(userSpecies) && category === "Physical") {
    speciesHeldItemAttackMultiplier *= 2;
  }
  if (userItem === "DEEPSEATOOTH" && userSpecies === "CLAMPERL" && category === "Special") {
    speciesHeldItemAttackMultiplier *= 2;
  }
  const attackMultiplier = solarPowerAttackMultiplier * defeatistAttackMultiplier * speciesHeldItemAttackMultiplier;

  let powerMultiplier = 1;
  if (weather === "Sandstorm" && userAbility === "SANDFORCE" && ["ROCK", "GROUND", "STEEL"].includes(moveType)) {
    powerMultiplier *= 1.3;
  }
  if (TYPE_BOOST_ITEMS[moveType] === userItem) powerMultiplier *= 1.2;
  if (userItem === "MUSCLEBAND" && category === "Physical") powerMultiplier *= 1.1;
  if (userItem === "WISEGLASSES" && category === "Special") powerMultiplier *= 1.1;
  if (userAbility === "TOXICBOOST" && category === "Physical" && ["POISON", "TOXIC"].includes(userStatus)) powerMultiplier *= 1.5;
  if (userAbility === "FLAREBOOST" && category === "Special" && userStatus === "BURN") powerMultiplier *= 1.5;
  const abilityTypeBoost = ABILITY_TYPE_POWER_BOOSTS[userAbility];
  if (abilityTypeBoost?.type === moveType) powerMultiplier *= abilityTypeBoost.multiplier;
  if (userAbility === "RIVALRY" && userGender && targetGender) powerMultiplier *= userGender === targetGender ? 1.25 : 0.75;

  let finalDamageMultiplier = 1;
  if (userAbility === "TINTEDLENS" && typeMod > 0 && typeMod < 1) finalDamageMultiplier *= 2;
  if (userItem === "EXPERTBELT" && typeMod > 1) finalDamageMultiplier *= 1.2;
  if (userAbility === "NEUROFORCE" && typeMod > 1) finalDamageMultiplier *= 1.25;
  if (typeMod > 1 && (
    (MOLD_BREAKER_SUPER_EFFECTIVE_REDUCTION_ABILITIES.has(targetAbility) && !moldBreaker)
    || UNBYPASSABLE_SUPER_EFFECTIVE_REDUCTION_ABILITIES.has(targetAbility)
  )) finalDamageMultiplier *= 0.75;
  if (userAbility === "SNIPER" && critical) finalDamageMultiplier *= 1.5;
  if (targetAbility === "DRYSKIN" && moveType === "FIRE" && !moldBreaker) finalDamageMultiplier *= 1.25;
  if (targetAbility === "FLUFFY" && !moldBreaker) {
    if (moveMakesContactCanonical(move, context, userAbility)) finalDamageMultiplier *= 0.5;
    if (moveType === "FIRE") finalDamageMultiplier *= 2;
  }
  if (targetAbility === "PURIFYINGSALT" && moveType === "GHOST" && !moldBreaker) finalDamageMultiplier *= 0.5;
  const fullHpReduction = FULL_HP_DAMAGE_REDUCTION_ABILITIES[targetAbility];
  if (pokemonAtFullHp(target)
    && fullHpReduction
    && !(fullHpReduction.bypassedByMoldBreaker && moldBreaker)) {
    finalDamageMultiplier *= 0.5;
  }
  finalDamageMultiplier *= targetTypeResistBerry.damageMultiplier;

  return Object.freeze({
    priorityModifier: pranksterPriority,
    criticalStageDelta,
    criticalHitPrevention,
    moveSelection: Object.freeze({
      blocked: moveSelectionBlocked,
      reason: moveSelectionReason,
    }),
    movePriorityBlock: Object.freeze({
      blocked: priorityAbilityBlocksMove,
      reason: priorityAbilityBlocksMove ? "target_priority_block_ability" : null,
      targetAbility,
      effectivePriority: Number.isFinite(effectivePriority) ? effectivePriority : null,
      targetsOpponent,
      moldBreaker,
    }),
    damageMultiplierInput: Object.freeze({
      externalPowerMultiplier: powerMultiplier,
      externalAttackMultiplier: attackMultiplier,
      externalDefenseMultiplier: defenseMultiplier,
      externalFinalDamageMultiplier: finalDamageMultiplier,
    }),
    accuracyModifierInput: Object.freeze({
      externalAccuracyMultiplier: accuracyMultiplier,
    }),
    speedInput: Object.freeze({
      abilityMultiplier: weatherSpeedMultiplier,
    }),
    secondaryEffectInput: Object.freeze({
      targetHasCovertCloak: targetItem === "COVERTCLOAK",
    }),
    damageCalculationInput: Object.freeze({
      userUnaware: userAbility === "UNAWARE",
      targetUnaware: targetAbility === "UNAWARE" && !moldBreaker,
      targetCriticalHitPrevention: criticalHitPrevention,
    }),
    targetTypeResistBerry,
  });
}

export const BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: EXTENSION_ABILITY_IDS,
  itemIds: EXTENSION_ITEM_IDS,
  abilityCount: EXTENSION_ABILITY_IDS.length,
  itemCount: EXTENSION_ITEM_IDS.length,
  classificationCounts: Object.freeze({
    movePriority: 1,
    priorityBlockAbilities: PRIORITY_BLOCK_ABILITIES.size,
    criticalStage: 3,
    criticalHitPreventionAbilities: CRITICAL_HIT_PREVENTION_ABILITIES.size,
    moveSelectionRestriction: 1 + PRIORITY_BLOCK_ABILITIES.size,
    specialDefenseModifier: 1,
    statusDefenseModifierAbilities: 1,
    accuracyModifier: 1,
    weatherEvasionAbilities: Object.keys(WEATHER_EVASION_ABILITIES).length,
    weatherSpeedModifier: 4,
    weatherSpecialAttackModifier: 1,
    statStageIgnore: 1,
    weatherPowerModifier: 1,
    typeBoostHeldItems: Object.keys(TYPE_BOOST_ITEMS).length,
    categoryBoostHeldItems: 2,
    speciesSpecificStatHeldItems: SPECIES_SPECIFIC_STAT_ITEMS.length,
    superEffectiveOffenseModifier: 3,
    superEffectiveDamageBoostAbilities: 1,
    superEffectiveDefenseModifier: MOLD_BREAKER_SUPER_EFFECTIVE_REDUCTION_ABILITIES.size + UNBYPASSABLE_SUPER_EFFECTIVE_REDUCTION_ABILITIES.size,
    fullHpDamageReductionAbilities: Object.keys(FULL_HP_DAMAGE_REDUCTION_ABILITIES).length,
    contactDamageModifierAbilities: 1,
    typeDamageReductionAbilities: 1,
    criticalDamageModifier: 1,
    targetAccuracyHeldItems: 2,
    typeWeaknessAbilityModifier: 1,
    secondaryEffectSuppressionHeldItems: 1,
    lowHpAttackPenaltyAbilities: 1,
    statusPowerBoostAbilities: 2,
    typePowerBoostAbilities: Object.keys(ABILITY_TYPE_POWER_BOOSTS).length,
    genderPowerModifierAbilities: 1,
    typeResistBerryHeldItems: BATTLE_TYPE_RESIST_BERRY_COVERAGE_CANONICAL.itemCount,
  }),
});
