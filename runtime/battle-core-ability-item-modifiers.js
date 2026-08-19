const MOLD_BREAKER_ABILITIES = new Set(["MOLDBREAKER", "TERAVOLT", "TURBOBLAZE"]);
const INTIMIDATE_BLOCKERS = new Set(["INNERFOCUS", "OBLIVIOUS", "OWNTEMPO", "SCRAPPY"]);
const CHOICE_ITEMS = new Set(["CHOICEBAND", "CHOICESPECS", "CHOICESCARF"]);
const STATUS_IMMUNITY_ABILITIES = Object.freeze({
  SLEEP: new Set(["INSOMNIA", "VITALSPIRIT", "SWEETVEIL", "PURIFYINGSALT"]),
  POISON: new Set(["IMMUNITY", "PASTELVEIL", "PURIFYINGSALT"]),
  BURN: new Set(["WATERVEIL", "WATERBUBBLE", "THERMALEXCHANGE", "PURIFYINGSALT"]),
  PARALYSIS: new Set(["LIMBER", "PURIFYINGSALT"]),
  FROZEN: new Set(["MAGMAARMOR", "PURIFYINGSALT"]),
});
const TYPE_IMMUNITY_ABILITIES = Object.freeze({
  GROUND: new Set(["LEVITATE", "EARTHEATER"]),
  FIRE: new Set(["FLASHFIRE", "WELLBAKEDBODY"]),
  WATER: new Set(["WATERABSORB", "DRYSKIN", "STORMDRAIN"]),
  ELECTRIC: new Set(["VOLTABSORB", "LIGHTNINGROD", "MOTORDRIVE"]),
  GRASS: new Set(["SAPSIPPER"]),
});
const PINCH_HEAL_BERRIES = new Set(["FIGYBERRY", "WIKIBERRY", "MAGOBERRY", "AGUAVBERRY", "IAPAPABERRY"]);
const PINCH_STAT_BERRIES = Object.freeze({
  LIECHIBERRY: "ATTACK",
  GANLONBERRY: "DEFENSE",
  PETAYABERRY: "SPECIAL_ATTACK",
  APICOTBERRY: "SPECIAL_DEFENSE",
  SALACBERRY: "SPEED",
});
const SPEED_HALVING_ITEMS = new Set([
  "IRONBALL", "MACHOBRACE", "POWERWEIGHT", "POWERBRACER", "POWERBELT",
  "POWERLENS", "POWERBAND", "POWERANKLET",
]);

function canonicalId(value) {
  const raw = typeof value === "string" ? value : value?.id;
  return String(raw ?? "").toUpperCase();
}

function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

function positiveFinite(value, fallback = 1) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number) || number < 0) throw new TypeError("battle modifier must be a non-negative finite number");
  return number;
}

function integerHp(pokemon, key, fallback = 0) {
  const value = key === "maxHp" ? (pokemon?.max_hp ?? pokemon?.maxHp) : pokemon?.[key];
  return Math.max(0, Math.trunc(Number(value ?? fallback)));
}

function pokemonTypes(pokemon) {
  return (Array.isArray(pokemon?.types) ? pokemon.types : []).map(canonicalId).filter(Boolean);
}

function atOrBelowFraction(hp, maxHp, numerator, denominator) {
  return maxHp > 0 && hp > 0 && hp * denominator <= maxHp * numerator;
}

function fractionalHpDelta(pokemon, numerator, denominator, sign = 1) {
  const hp = integerHp(pokemon, "hp");
  const maxHp = integerHp(pokemon, "maxHp");
  if (hp <= 0 || maxHp <= 0) return 0;
  const amount = Math.max(1, Math.floor(maxHp * numerator / denominator));
  if (sign > 0) return Math.min(maxHp - hp, amount);
  return -Math.min(hp, amount);
}

function consumeRequest(item, effectKind, extra = {}) {
  return Object.freeze({ item, itemIsBerry: item.endsWith("BERRY"), effectKind, ...extra });
}

export function battlePokemonAbilityIdCanonical(pokemon) {
  if (hasOwn(pokemon, "ability")) return canonicalId(pokemon.ability);
  return canonicalId(pokemon?.ability_id);
}

export function battlePokemonHeldItemIdCanonical(pokemon) {
  if (hasOwn(pokemon, "held_item")) return canonicalId(pokemon.held_item);
  return canonicalId(pokemon?.item);
}

export function resolveTypeImmunityAbilityEffectCanonical({ user = {}, target = {}, move = {}, moldBreaker = null } = {}) {
  const userAbility = battlePokemonAbilityIdCanonical(user);
  const targetAbility = battlePokemonAbilityIdCanonical(target);
  const moveType = canonicalId(move?.type);
  const bypass = moldBreaker === null ? MOLD_BREAKER_ABILITIES.has(userAbility) : Boolean(moldBreaker);
  const immune = Boolean(moveType && TYPE_IMMUNITY_ABILITIES[moveType]?.has(targetAbility) && !bypass);
  let afterEffect = null;
  if (immune) {
    if (["WATERABSORB", "DRYSKIN", "VOLTABSORB", "EARTHEATER"].includes(targetAbility)) {
      afterEffect = Object.freeze({ kind: "heal", hpFraction: Object.freeze([1, 4]) });
    } else if (targetAbility === "STORMDRAIN" || targetAbility === "LIGHTNINGROD") {
      afterEffect = Object.freeze({ kind: "stat_stage", changes: Object.freeze([Object.freeze({ subject: "target", stat: "SPECIAL_ATTACK", delta: 1 })]) });
    } else if (targetAbility === "MOTORDRIVE") {
      afterEffect = Object.freeze({ kind: "stat_stage", changes: Object.freeze([Object.freeze({ subject: "target", stat: "SPEED", delta: 1 })]) });
    } else if (targetAbility === "SAPSIPPER") {
      afterEffect = Object.freeze({ kind: "stat_stage", changes: Object.freeze([Object.freeze({ subject: "target", stat: "ATTACK", delta: 1 })]) });
    } else if (targetAbility === "WELLBAKEDBODY") {
      afterEffect = Object.freeze({ kind: "stat_stage", changes: Object.freeze([Object.freeze({ subject: "target", stat: "DEFENSE", delta: 2 })]) });
    } else if (targetAbility === "FLASHFIRE") {
      afterEffect = Object.freeze({ kind: "activate", flag: "FLASH_FIRE" });
    }
  }
  return Object.freeze({
    userAbility,
    targetAbility,
    moveType,
    moldBreaker: bypass,
    immune,
    afterEffect,
    source: immune ? "ability_type_immunity" : null,
  });
}

export function resolveAbilityItemActionModifiersCanonical({ user = {}, target = {}, move = {} } = {}) {
  const userAbility = battlePokemonAbilityIdCanonical(user);
  const targetAbility = battlePokemonAbilityIdCanonical(target);
  const userItem = battlePokemonHeldItemIdCanonical(user);
  const moveType = canonicalId(move.type);
  const category = String(move.category ?? "Status");
  const power = Math.max(0, Number(move.power ?? 0));
  const moldBreaker = MOLD_BREAKER_ABILITIES.has(userAbility);
  const userHp = integerHp(user, "hp");
  const userMaxHp = integerHp(user, "maxHp");
  const targetHp = integerHp(target, "hp");
  const targetMaxHp = integerHp(target, "maxHp");

  let accuracyMultiplier = 1;
  if (userAbility === "COMPOUNDEYES") accuracyMultiplier *= 1.3;
  if (userAbility === "HUSTLE" && category === "Physical") accuracyMultiplier *= 0.8;
  if (userItem === "WIDELENS") accuracyMultiplier *= 1.1;

  let attackMultiplier = 1;
  if (userItem === "CHOICEBAND" && category === "Physical") attackMultiplier *= 1.5;
  if (userItem === "CHOICESPECS" && category === "Special") attackMultiplier *= 1.5;
  if (["HUGEPOWER", "PUREPOWER"].includes(userAbility) && category === "Physical") attackMultiplier *= 2;
  if (userAbility === "GORILLATACTICS" && category === "Physical") attackMultiplier *= 1.5;

  let defenseMultiplier = 1;
  if (targetAbility === "FURCOAT" && category === "Physical" && !moldBreaker) defenseMultiplier *= 2;
  if (targetAbility === "ICESCALES" && category === "Special" && !moldBreaker) defenseMultiplier *= 2;
  if (targetAbility === "MARVELSCALE" && category === "Physical" && String(target.status ?? "NONE").toUpperCase() !== "NONE" && !moldBreaker) defenseMultiplier *= 1.5;

  let powerMultiplier = 1;
  if (userAbility === "TECHNICIAN" && power > 0 && power <= 60) powerMultiplier *= 1.5;
  if (userAbility === "WATERBUBBLE" && moveType === "WATER") powerMultiplier *= 2;
  const lowHp = atOrBelowFraction(userHp, userMaxHp, 1, 3);
  if (lowHp && ((userAbility === "BLAZE" && moveType === "FIRE") ||
    (userAbility === "TORRENT" && moveType === "WATER") ||
    (userAbility === "OVERGROW" && moveType === "GRASS") ||
    (userAbility === "SWARM" && moveType === "BUG"))) powerMultiplier *= 1.5;

  let finalDamageMultiplier = 1;
  if (targetAbility === "WATERBUBBLE" && moveType === "FIRE" && !moldBreaker) finalDamageMultiplier *= 0.5;
  if (targetAbility === "THICKFAT" && ["FIRE", "ICE"].includes(moveType) && !moldBreaker) finalDamageMultiplier *= 0.5;
  if (targetAbility === "HEATPROOF" && moveType === "FIRE" && !moldBreaker) finalDamageMultiplier *= 0.5;
  if (targetAbility === "MULTISCALE" && targetHp > 0 && targetHp === targetMaxHp && !moldBreaker) finalDamageMultiplier *= 0.5;
  if (targetAbility === "SHADOWSHIELD" && targetHp > 0 && targetHp === targetMaxHp) finalDamageMultiplier *= 0.5;
  if (userItem === "MUSCLEBAND" && category === "Physical") finalDamageMultiplier *= 1.1;
  if (userItem === "WISEGLASSES" && category === "Special") finalDamageMultiplier *= 1.1;
  if (userItem === "LIFEORB" && category !== "Status" && power > 0) finalDamageMultiplier *= 1.3;

  let abilitySpeedMultiplier = 1;
  const status = String(user.status ?? "NONE").toUpperCase();
  const quickFeetActive = userAbility === "QUICKFEET" && status !== "NONE";
  if (quickFeetActive) abilitySpeedMultiplier *= 1.5;
  let itemSpeedMultiplier = userItem === "CHOICESCARF" ? 1.5 : 1;
  if (SPEED_HALVING_ITEMS.has(userItem)) itemSpeedMultiplier *= 0.5;

  const typeImmunityResolution = resolveTypeImmunityAbilityEffectCanonical({ user, target, move, moldBreaker });
  const noGuard = userAbility === "NOGUARD" || targetAbility === "NOGUARD";
  return Object.freeze({
    userAbility,
    targetAbility,
    userItem,
    moldBreaker,
    typeImmunity: typeImmunityResolution.immune,
    typeImmunityResolution,
    noGuard,
    damageMultiplierInput: Object.freeze({
      adaptability: userAbility === "ADAPTABILITY",
      guts: userAbility === "GUTS",
      infiltrator: userAbility === "INFILTRATOR",
      externalPowerMultiplier: positiveFinite(powerMultiplier),
      externalAttackMultiplier: positiveFinite(attackMultiplier),
      externalDefenseMultiplier: positiveFinite(defenseMultiplier),
      externalFinalDamageMultiplier: positiveFinite(finalDamageMultiplier),
    }),
    accuracyModifierInput: Object.freeze({ externalAccuracyMultiplier: positiveFinite(accuracyMultiplier) }),
    speedInput: Object.freeze({
      abilityMultiplier: positiveFinite(abilitySpeedMultiplier),
      itemMultiplier: positiveFinite(itemSpeedMultiplier),
      quickFeetActive,
    }),
    secondaryEffectInput: Object.freeze({
      userHasSereneGrace: userAbility === "SERENEGRACE",
      userHasSheerForce: userAbility === "SHEERFORCE",
      targetHasShieldDust: targetAbility === "SHIELDDUST" && !moldBreaker,
      moldBreaker,
    }),
  });
}

export function resolveAbilityStatusEligibilityCanonical({ target = {}, newStatus, moldBreaker = false } = {}) {
  const ability = battlePokemonAbilityIdCanonical(target);
  const status = String(newStatus ?? "").toUpperCase();
  const blocked = STATUS_IMMUNITY_ABILITIES[status]?.has(ability) === true && !Boolean(moldBreaker);
  return Object.freeze({
    targetAbility: ability,
    statusImmunityAbility: blocked,
    source: blocked ? "ability" : null,
  });
}

export function resolveEntryAbilityStatEffectCanonical({ user = {}, target = {} } = {}) {
  const ability = battlePokemonAbilityIdCanonical(user);
  const targetAbility = battlePokemonAbilityIdCanonical(target);
  if (ability === "INTIMIDATE") {
    if (INTIMIDATE_BLOCKERS.has(targetAbility)) {
      return Object.freeze({ ability, changes: Object.freeze([]), blocked: true, reason: "target_ability" });
    }
    return Object.freeze({
      ability,
      blocked: false,
      reason: "intimidate",
      changes: Object.freeze([Object.freeze({ subject: "target", stat: "ATTACK", delta: -1 })]),
    });
  }
  if (ability === "DOWNLOAD") {
    const defense = Math.max(0, Number(target?.stats?.DEFENSE ?? 0));
    const specialDefense = Math.max(0, Number(target?.stats?.SPECIAL_DEFENSE ?? 0));
    const stat = specialDefense <= defense ? "SPECIAL_ATTACK" : "ATTACK";
    return Object.freeze({
      ability,
      blocked: false,
      reason: "download",
      changes: Object.freeze([Object.freeze({ subject: "user", stat, delta: 1 })]),
    });
  }
  return Object.freeze({ ability, changes: Object.freeze([]), blocked: false, reason: "no_entry_stat_effect" });
}

export function resolveChoiceLockCanonical({ pokemon = {}, selectedMoveId = null, lockedMoveId = null } = {}) {
  const item = battlePokemonHeldItemIdCanonical(pokemon);
  const ability = battlePokemonAbilityIdCanonical(pokemon);
  const choiceSource = CHOICE_ITEMS.has(item) ? item : (ability === "GORILLATACTICS" ? ability : null);
  if (!choiceSource) return Object.freeze({ active: false, allowed: true, source: null, lockedMoveId: null, selectedMoveId: canonicalId(selectedMoveId) || null });
  const selected = canonicalId(selectedMoveId) || null;
  const locked = canonicalId(lockedMoveId) || null;
  if (!selected) return Object.freeze({ active: true, allowed: true, source: choiceSource, lockedMoveId: locked, selectedMoveId: null });
  if (locked && locked !== selected) return Object.freeze({ active: true, allowed: false, source: choiceSource, lockedMoveId: locked, selectedMoveId: selected, reason: "choice_lock" });
  return Object.freeze({ active: true, allowed: true, source: choiceSource, lockedMoveId: locked ?? selected, selectedMoveId: selected });
}

export function resolveTurnEndHeldItemEffectCanonical(pokemon = {}) {
  const item = battlePokemonHeldItemIdCanonical(pokemon);
  const hp = integerHp(pokemon, "hp");
  const maxHp = integerHp(pokemon, "maxHp");
  if (item !== "LEFTOVERS" || hp <= 0 || maxHp <= 0 || hp >= maxHp) {
    return Object.freeze({ item, triggered: false, heal: 0, boundary: "turn_end" });
  }
  const heal = Math.min(maxHp - hp, Math.max(1, Math.floor(maxHp / 16)));
  return Object.freeze({ item, triggered: heal > 0, heal, boundary: "turn_end" });
}

export function resolveTurnEndAbilityItemHookCanonical(pokemon = {}, context = {}) {
  const ability = battlePokemonAbilityIdCanonical(pokemon);
  const item = battlePokemonHeldItemIdCanonical(pokemon);
  const hp = integerHp(pokemon, "hp");
  const maxHp = integerHp(pokemon, "maxHp");
  const status = String(pokemon?.status ?? "NONE").toUpperCase();
  const types = pokemonTypes(pokemon);
  const weather = String(context?.effectiveWeather ?? "");
  const alive = hp > 0 && maxHp > 0;
  let hpDelta = 0;
  let reason = null;
  const statChanges = [];
  let statusRequest = null;

  if (alive && item === "LEFTOVERS" && hp < maxHp) {
    hpDelta = fractionalHpDelta(pokemon, 1, 16, 1); reason = "leftovers";
  } else if (alive && item === "BLACKSLUDGE") {
    if (types.includes("POISON") && hp < maxHp) { hpDelta = fractionalHpDelta(pokemon, 1, 16, 1); reason = "black_sludge_heal"; }
    else if (!types.includes("POISON") && ability !== "MAGICGUARD") { hpDelta = fractionalHpDelta(pokemon, 1, 8, -1); reason = "black_sludge_damage"; }
  } else if (alive && ability === "POISONHEAL" && status === "POISON" && hp < maxHp) {
    hpDelta = fractionalHpDelta(pokemon, 1, 8, 1); reason = "poison_heal";
  } else if (alive && ability === "RAINDISH" && ["Rain", "HeavyRain"].includes(weather) && hp < maxHp) {
    hpDelta = fractionalHpDelta(pokemon, 1, 16, 1); reason = "rain_dish";
  } else if (alive && ability === "ICEBODY" && ["Hail", "Snow"].includes(weather) && hp < maxHp) {
    hpDelta = fractionalHpDelta(pokemon, 1, 16, 1); reason = "ice_body";
  } else if (alive && ability === "DRYSKIN" && ["Rain", "HeavyRain"].includes(weather) && hp < maxHp) {
    hpDelta = fractionalHpDelta(pokemon, 1, 8, 1); reason = "dry_skin_rain";
  } else if (alive && ability === "DRYSKIN" && ["Sun", "HarshSun"].includes(weather)) {
    hpDelta = fractionalHpDelta(pokemon, 1, 8, -1); reason = "dry_skin_sun";
  } else if (alive && ability === "SOLARPOWER" && ["Sun", "HarshSun"].includes(weather)) {
    hpDelta = fractionalHpDelta(pokemon, 1, 8, -1); reason = "solar_power";
  }

  if (alive && ability === "SPEEDBOOST") statChanges.push(Object.freeze({ subject: "user", stat: "SPEED", delta: 1 }));
  if (alive && status === "NONE" && item === "FLAMEORB") statusRequest = Object.freeze({ status: "BURN", source: "held_item" });
  if (alive && status === "NONE" && item === "TOXICORB") statusRequest = Object.freeze({ status: "POISON", toxic: true, source: "held_item" });

  return Object.freeze({
    boundary: "turn_end",
    ability,
    item,
    triggered: hpDelta !== 0 || statChanges.length > 0 || statusRequest !== null,
    hpDelta,
    reason,
    statChanges: Object.freeze(statChanges),
    statusRequest,
  });
}

export function resolveHpBerryTriggerCanonical(pokemon = {}) {
  const result = resolveHpThresholdBerryHookCanonical(pokemon);
  return Object.freeze({
    item: result.item,
    triggered: result.triggered && result.heal > 0,
    heal: result.heal,
    consumeRequest: result.heal > 0 ? result.consumeRequest : null,
    boundary: "consumable",
  });
}

export function resolveHpThresholdBerryHookCanonical(pokemon = {}) {
  const item = battlePokemonHeldItemIdCanonical(pokemon);
  const hp = integerHp(pokemon, "hp");
  const maxHp = integerHp(pokemon, "maxHp");
  if (hp <= 0 || maxHp <= 0) return Object.freeze({ item, triggered: false, heal: 0, statChanges: Object.freeze([]), consumeRequest: null, boundary: "action_after" });
  let heal = 0;
  const statChanges = [];
  let confusionCheckRequired = false;
  if (item === "ORANBERRY" && hp * 2 <= maxHp) heal = 10;
  else if (item === "SITRUSBERRY" && hp * 2 <= maxHp) heal = Math.max(1, Math.floor(maxHp / 4));
  else if (PINCH_HEAL_BERRIES.has(item) && hp * 4 <= maxHp) {
    heal = Math.max(1, Math.floor(maxHp / 3));
    confusionCheckRequired = true;
  } else if (PINCH_STAT_BERRIES[item] && hp * 4 <= maxHp) {
    statChanges.push(Object.freeze({ subject: "user", stat: PINCH_STAT_BERRIES[item], delta: 1 }));
  }
  heal = Math.min(Math.max(0, maxHp - hp), heal);
  const triggered = heal > 0 || statChanges.length > 0;
  return Object.freeze({
    item,
    triggered,
    heal,
    statChanges: Object.freeze(statChanges),
    confusionCheckRequired,
    consumeRequest: triggered ? consumeRequest(item, heal > 0 ? "hp_restore" : "stat_raise") : null,
    boundary: "action_after",
  });
}

export function resolveActionAfterAbilityItemHookCanonical({ user = {}, target = {}, move = {}, damageDealt = 0 } = {}) {
  const userAbility = battlePokemonAbilityIdCanonical(user);
  const userItem = battlePokemonHeldItemIdCanonical(user);
  const damaging = String(move?.category ?? "Status") !== "Status" && Number(damageDealt ?? 0) > 0;
  const sheerForceSuppressesLifeOrb = userAbility === "SHEERFORCE" && Number(move?.effect_chance ?? move?.effectChance ?? 0) > 0;
  let userHpDelta = 0;
  let reason = null;
  if (damaging && userItem === "LIFEORB" && userAbility !== "MAGICGUARD" && !sheerForceSuppressesLifeOrb) {
    userHpDelta = fractionalHpDelta(user, 1, 10, -1); reason = "life_orb";
  } else if (damaging && userItem === "SHELLBELL") {
    const hp = integerHp(user, "hp");
    const maxHp = integerHp(user, "maxHp");
    const heal = Math.max(1, Math.floor(Number(damageDealt) / 8));
    userHpDelta = Math.min(Math.max(0, maxHp - hp), heal); reason = "shell_bell";
  }
  return Object.freeze({
    boundary: "action_after",
    userAbility,
    userItem,
    userHpDelta,
    reason,
    targetBerry: resolveHpThresholdBerryHookCanonical(target),
  });
}

export function resolveSurvivalAbilityItemHookCanonical({ target = {}, incomingDamage = 0, moldBreaker = false } = {}) {
  const ability = battlePokemonAbilityIdCanonical(target);
  const item = battlePokemonHeldItemIdCanonical(target);
  const hp = integerHp(target, "hp");
  const maxHp = integerHp(target, "maxHp");
  const damage = Math.max(0, Math.trunc(Number(incomingDamage ?? 0)));
  const lethalFromFull = hp > 1 && hp === maxHp && damage >= hp;
  if (!lethalFromFull) return Object.freeze({ triggered: false, ability, item, damage, consumeRequest: null, boundary: "survival" });
  if (ability === "STURDY" && !Boolean(moldBreaker)) {
    return Object.freeze({ triggered: true, source: "STURDY", ability, item, damage: hp - 1, consumeRequest: null, boundary: "survival" });
  }
  if (item === "FOCUSSASH") {
    return Object.freeze({ triggered: true, source: "FOCUSSASH", ability, item, damage: hp - 1, consumeRequest: consumeRequest(item, "survival", { permanent: true }), boundary: "survival" });
  }
  return Object.freeze({ triggered: false, ability, item, damage, consumeRequest: null, boundary: "survival" });
}

export function resolveSwitchInAbilityItemHookCanonical({ user = {}, target = {} } = {}) {
  return Object.freeze({ boundary: "switch_in", entry: resolveEntryAbilityStatEffectCanonical({ user, target }) });
}

export function resolveActionBeforeAbilityItemHookCanonical({ user = {}, target = {}, move = {}, selectedMoveId = null, lockedMoveId = null } = {}) {
  return Object.freeze({
    boundary: "action_before",
    modifiers: resolveAbilityItemActionModifiersCanonical({ user, target, move }),
    choiceLock: resolveChoiceLockCanonical({ pokemon: user, selectedMoveId: selectedMoveId ?? move?.id ?? null, lockedMoveId }),
  });
}

const IMPLEMENTED_ABILITY_IDS = Object.freeze([
  "ADAPTABILITY", "BLAZE", "COMPOUNDEYES", "DOWNLOAD", "DRYSKIN", "EARTHEATER", "FLASHFIRE",
  "FURCOAT", "GORILLATACTICS", "GUTS", "HEATPROOF", "HUGEPOWER", "HUSTLE", "ICEBODY", "ICESCALES",
  "IMMUNITY", "INFILTRATOR", "INNERFOCUS", "INSOMNIA", "INTIMIDATE", "LEVITATE", "LIGHTNINGROD",
  "LIMBER", "MAGICGUARD", "MAGMAARMOR", "MARVELSCALE", "MOLDBREAKER", "MOTORDRIVE", "MULTISCALE",
  "NOGUARD", "OBLIVIOUS", "OVERGROW", "OWNTEMPO", "PASTELVEIL", "POISONHEAL", "PUREPOWER",
  "PURIFYINGSALT", "QUICKFEET", "RAINDISH", "SAPSIPPER", "SCRAPPY", "SERENEGRACE", "SHADOWSHIELD",
  "SHEERFORCE", "SHIELDDUST", "SOLARPOWER", "SPEEDBOOST", "STORMDRAIN", "STURDY", "SWARM", "SWEETVEIL",
  "TECHNICIAN", "THERMALEXCHANGE", "THICKFAT", "TORRENT", "TURBOBLAZE", "TERAVOLT", "VITALSPIRIT",
  "VOLTABSORB", "WATERABSORB", "WATERBUBBLE", "WATERVEIL", "WELLBAKEDBODY",
].sort());
const IMPLEMENTED_ITEM_IDS = Object.freeze([
  ...CHOICE_ITEMS, ...SPEED_HALVING_ITEMS, ...PINCH_HEAL_BERRIES, ...Object.keys(PINCH_STAT_BERRIES),
  "LEFTOVERS", "BLACKSLUDGE", "ORANBERRY", "SITRUSBERRY", "FLAMEORB", "TOXICORB", "FOCUSSASH",
  "LIFEORB", "SHELLBELL", "MUSCLEBAND", "WISEGLASSES", "WIDELENS",
].sort());

export const BATTLE_ABILITY_ITEM_IMPLEMENTED_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: IMPLEMENTED_ABILITY_IDS,
  itemIds: IMPLEMENTED_ITEM_IDS,
  abilityCount: IMPLEMENTED_ABILITY_IDS.length,
  itemCount: IMPLEMENTED_ITEM_IDS.length,
  classificationCounts: Object.freeze({
    switchIn: 2,
    typeImmunityOrAbsorb: Object.values(TYPE_IMMUNITY_ABILITIES).reduce((sum, set) => sum + set.size, 0),
    statusImmunity: new Set(Object.values(STATUS_IMMUNITY_ABILITIES).flatMap((set) => [...set])).size,
    choiceLockSources: CHOICE_ITEMS.size + 1,
    hpThresholdBerries: 2 + PINCH_HEAL_BERRIES.size + Object.keys(PINCH_STAT_BERRIES).length,
    survivalSources: 2,
  }),
});

export const BATTLE_ABILITY_ITEM_BOUNDARIES_CANONICAL = Object.freeze({
  constantModifiers: "read-only action calculation facts; no Pokemon mutation",
  switchIn: "returns stat-stage requests; battle stat-stage owner applies them",
  actionBefore: "returns choice-lock and calculation facts; command/action owners enforce them",
  actionAfter: "returns HP/item requests after resolved damage; Pokemon/held-item owners commit them",
  turnEnd: "returns HP/status/stat requests; battle runtime owns reflection",
  survival: "returns damage cap and optional consume request; HP/held-item owners commit them",
  consumption: "returns consume request; battle-held-item lifecycle owns removal and Pokemon Runtime reflection",
});