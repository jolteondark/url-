const MOLD_BREAKER_ABILITIES = new Set(["MOLDBREAKER", "TERAVOLT", "TURBOBLAZE"]);
const INTIMIDATE_BLOCKERS = new Set(["INNERFOCUS", "OBLIVIOUS", "OWNTEMPO", "SCRAPPY"]);
const STATUS_IMMUNITY_ABILITIES = Object.freeze({
  SLEEP: new Set(["INSOMNIA", "VITALSPIRIT"]),
  POISON: new Set(["IMMUNITY"]),
  BURN: new Set(["WATERVEIL", "WATERBUBBLE"]),
  PARALYSIS: new Set(["LIMBER"]),
  FROZEN: new Set(["MAGMAARMOR"]),
});

function canonicalId(value) {
  const raw = typeof value === "string" ? value : value?.id;
  return String(raw ?? "").toUpperCase();
}

function positiveFinite(value, fallback = 1) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number) || number < 0) throw new TypeError("battle modifier must be a non-negative finite number");
  return number;
}

export function battlePokemonAbilityIdCanonical(pokemon) {
  return canonicalId(pokemon?.ability ?? pokemon?.ability_id);
}

export function battlePokemonHeldItemIdCanonical(pokemon) {
  return canonicalId(pokemon?.item ?? pokemon?.held_item);
}

export function resolveAbilityItemActionModifiersCanonical({ user = {}, target = {}, move = {} } = {}) {
  const userAbility = battlePokemonAbilityIdCanonical(user);
  const targetAbility = battlePokemonAbilityIdCanonical(target);
  const userItem = battlePokemonHeldItemIdCanonical(user);
  const moveType = canonicalId(move.type);
  const category = String(move.category ?? "Status");
  const power = Math.max(0, Number(move.power ?? 0));
  const moldBreaker = MOLD_BREAKER_ABILITIES.has(userAbility);

  let accuracyMultiplier = 1;
  if (userAbility === "COMPOUNDEYES") accuracyMultiplier *= 1.3;
  if (userAbility === "HUSTLE" && category === "Physical") accuracyMultiplier *= 0.8;

  let attackMultiplier = 1;
  if (userItem === "CHOICEBAND" && category === "Physical") attackMultiplier *= 1.5;
  if (userItem === "CHOICESPECS" && category === "Special") attackMultiplier *= 1.5;

  let powerMultiplier = 1;
  if (userAbility === "TECHNICIAN" && power > 0 && power <= 60) powerMultiplier *= 1.5;

  let abilitySpeedMultiplier = 1;
  const status = String(user.status ?? "NONE").toUpperCase();
  const quickFeetActive = userAbility === "QUICKFEET" && status !== "NONE";
  if (quickFeetActive) abilitySpeedMultiplier *= 1.5;
  const itemSpeedMultiplier = userItem === "CHOICESCARF" ? 1.5 : 1;

  return Object.freeze({
    userAbility,
    targetAbility,
    userItem,
    moldBreaker,
    typeImmunity: Boolean(moveType === "GROUND" && targetAbility === "LEVITATE" && !moldBreaker),
    damageMultiplierInput: Object.freeze({
      adaptability: userAbility === "ADAPTABILITY",
      guts: userAbility === "GUTS",
      infiltrator: userAbility === "INFILTRATOR",
      externalPowerMultiplier: positiveFinite(powerMultiplier),
      externalAttackMultiplier: positiveFinite(attackMultiplier),
    }),
    accuracyModifierInput: Object.freeze({ externalAccuracyMultiplier: positiveFinite(accuracyMultiplier) }),
    speedInput: Object.freeze({
      abilityMultiplier: positiveFinite(abilitySpeedMultiplier),
      itemMultiplier: positiveFinite(itemSpeedMultiplier),
      quickFeetActive,
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
  if (ability !== "INTIMIDATE") return Object.freeze({ ability, changes: Object.freeze([]), blocked: false, reason: "no_entry_stat_effect" });
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

export function resolveTurnEndHeldItemEffectCanonical(pokemon = {}) {
  const item = battlePokemonHeldItemIdCanonical(pokemon);
  const hp = Math.max(0, Math.trunc(Number(pokemon.hp ?? 0)));
  const maxHp = Math.max(0, Math.trunc(Number(pokemon.max_hp ?? pokemon.maxHp ?? 0)));
  if (item !== "LEFTOVERS" || hp <= 0 || maxHp <= 0 || hp >= maxHp) {
    return Object.freeze({ item, triggered: false, heal: 0, boundary: "turn_end" });
  }
  const heal = Math.min(maxHp - hp, Math.max(1, Math.floor(maxHp / 16)));
  return Object.freeze({ item, triggered: heal > 0, heal, boundary: "turn_end" });
}

export function resolveHpBerryTriggerCanonical(pokemon = {}) {
  const item = battlePokemonHeldItemIdCanonical(pokemon);
  const hp = Math.max(0, Math.trunc(Number(pokemon.hp ?? 0)));
  const maxHp = Math.max(0, Math.trunc(Number(pokemon.max_hp ?? pokemon.maxHp ?? 0)));
  if (hp <= 0 || maxHp <= 0 || hp * 2 > maxHp) {
    return Object.freeze({ item, triggered: false, heal: 0, consumeRequest: null, boundary: "consumable" });
  }
  let heal = 0;
  if (item === "ORANBERRY") heal = 10;
  else if (item === "SITRUSBERRY") heal = Math.max(1, Math.floor(maxHp / 4));
  if (heal <= 0) return Object.freeze({ item, triggered: false, heal: 0, consumeRequest: null, boundary: "consumable" });
  heal = Math.min(maxHp - hp, heal);
  return Object.freeze({
    item,
    triggered: heal > 0,
    heal,
    boundary: "consumable",
    consumeRequest: Object.freeze({ item, itemIsBerry: true, effectKind: "hp_restore" }),
  });
}

export const BATTLE_ABILITY_ITEM_BOUNDARIES_CANONICAL = Object.freeze({
  constantModifiers: "read-only action calculation facts; no Pokemon mutation",
  switchIn: "returns stat-stage requests; battle stat-stage owner applies them",
  turnEnd: "returns HP delta; battle runtime owns HP reflection",
  consumption: "returns consume request; battle-held-item lifecycle owns removal and Pokemon Runtime reflection",
});
