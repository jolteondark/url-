import {
  battlePokemonAbilityIdCanonical,
  battlePokemonHeldItemIdCanonical,
} from "./battle-core-ability-item-modifiers.js";

const CONTACT_REACTIVE_ABILITIES = new Set(["ROUGHSKIN", "IRONBARBS"]);
const CONTACT_STATUS_CHANCE_BY_ABILITY = Object.freeze({
  STATIC: Object.freeze({ status: "PARALYSIS", chance: 30 }),
  FLAMEBODY: Object.freeze({ status: "BURN", chance: 30 }),
  POISONPOINT: Object.freeze({ status: "POISON", chance: 30 }),
});
const MULTI_STATUS_CONTACT_ABILITIES = Object.freeze({
  EFFECTSPORE: Object.freeze({
    chance: 30,
    statuses: Object.freeze(["SLEEP", "PARALYSIS", "POISON"]),
    selection: "canonical_effect_spore",
  }),
});
const OFFENSIVE_CONTACT_STATUS_CHANCE_BY_ABILITY = Object.freeze({
  POISONTOUCH: Object.freeze({ status: "POISON", chance: 30 }),
});
const CONTACT_STAT_STAGE_BY_ABILITY = Object.freeze({
  TANGLINGHAIR: Object.freeze({ stat: "SPEED", delta: -1 }),
  GOOEY: Object.freeze({ stat: "SPEED", delta: -1 }),
});
const CONTACT_SUPPRESSING_ABILITIES = new Set(["LONGREACH"]);
const CONTACT_REACTIVE_ITEMS = new Set(["ROCKYHELMET"]);
const CONTACT_SUPPRESSING_ITEMS = new Set(["PROTECTIVEPADS"]);

function canonicalId(value) {
  const raw = typeof value === "string" ? value : value?.id;
  return String(raw ?? "").toUpperCase();
}

function pokemonTypesCanonical(pokemon) {
  return (Array.isArray(pokemon?.types) ? pokemon.types : []).map(canonicalId).filter(Boolean);
}

function maxHpCanonical(pokemon) {
  return Math.max(0, Math.trunc(Number(pokemon?.max_hp ?? pokemon?.maxHp ?? 0)));
}

function currentHpCanonical(pokemon) {
  return Math.max(0, Math.trunc(Number(pokemon?.hp ?? 0)));
}

function fractionalDamage(maxHp, denominator) {
  if (maxHp <= 0) return 0;
  return Math.max(1, Math.floor(maxHp / denominator));
}

function contactFactCanonical(move, context) {
  if (typeof context?.contact === "boolean") return context.contact;
  if (typeof move?.contact === "boolean") return move.contact;
  if (typeof move?.makes_contact === "boolean") return move.makes_contact;
  if (typeof move?.makesContact === "boolean") return move.makesContact;
  return false;
}

function hitFactCanonical(damageDealt, context) {
  if (typeof context?.hit === "boolean") return context.hit;
  return Number(damageDealt ?? 0) > 0;
}

function contactStatusChanceRequestCanonical(targetAbility) {
  const fact = CONTACT_STATUS_CHANCE_BY_ABILITY[targetAbility];
  if (!fact) return null;
  return Object.freeze({
    subject: "user",
    status: fact.status,
    chance: fact.chance,
    source: targetAbility,
    sourceKind: "ability",
  });
}

function effectSporeStatusChanceRequestCanonical({ user, userAbility, userItem, targetAbility }) {
  const fact = MULTI_STATUS_CONTACT_ABILITIES[targetAbility];
  if (!fact) return null;
  const powderImmune = pokemonTypesCanonical(user).includes("GRASS")
    || userAbility === "OVERCOAT"
    || userItem === "SAFETYGOGGLES";
  if (powderImmune) return null;
  return Object.freeze({
    subject: "user",
    chance: fact.chance,
    statuses: fact.statuses,
    selection: fact.selection,
    source: targetAbility,
    sourceKind: "ability",
  });
}

function offensiveContactStatusChanceRequestCanonical(userAbility) {
  const fact = OFFENSIVE_CONTACT_STATUS_CHANCE_BY_ABILITY[userAbility];
  if (!fact) return null;
  return Object.freeze({
    subject: "target",
    status: fact.status,
    chance: fact.chance,
    source: userAbility,
    sourceKind: "ability",
  });
}

function contactStatChangesCanonical(targetAbility) {
  const fact = CONTACT_STAT_STAGE_BY_ABILITY[targetAbility];
  if (!fact) return Object.freeze([]);
  return Object.freeze([Object.freeze({
    subject: "user",
    stat: fact.stat,
    delta: fact.delta,
    source: targetAbility,
    sourceKind: "ability",
  })]);
}

export function resolveContactReactiveAbilityItemHookCanonical({
  user = {},
  target = {},
  move = {},
  damageDealt = 0,
  context = {},
} = {}) {
  const userAbility = battlePokemonAbilityIdCanonical(user);
  const userItem = battlePokemonHeldItemIdCanonical(user);
  const targetAbility = battlePokemonAbilityIdCanonical(target);
  const targetItem = battlePokemonHeldItemIdCanonical(target);
  const contact = contactFactCanonical(move, context);
  const hit = hitFactCanonical(damageDealt, context);
  const userHp = currentHpCanonical(user);
  const userMaxHp = maxHpCanonical(user);
  const protectedFromContactEffects = CONTACT_SUPPRESSING_ABILITIES.has(userAbility)
    || CONTACT_SUPPRESSING_ITEMS.has(userItem)
    || Boolean(context?.contactEffectsSuppressed);
  const magicGuard = userAbility === "MAGICGUARD";
  const eligible = contact && hit && userHp > 0 && !protectedFromContactEffects;
  const effects = [];

  if (eligible && userMaxHp > 0 && CONTACT_REACTIVE_ABILITIES.has(targetAbility)) {
    const damage = magicGuard ? 0 : fractionalDamage(userMaxHp, 8);
    effects.push(Object.freeze({
      source: targetAbility,
      sourceKind: "ability",
      hpDelta: damage > 0 ? -damage : 0,
      suppressedByMagicGuard: magicGuard,
    }));
  }
  if (eligible && userMaxHp > 0 && CONTACT_REACTIVE_ITEMS.has(targetItem)) {
    const damage = magicGuard ? 0 : fractionalDamage(userMaxHp, 6);
    effects.push(Object.freeze({
      source: targetItem,
      sourceKind: "held_item",
      hpDelta: damage > 0 ? -damage : 0,
      suppressedByMagicGuard: magicGuard,
    }));
  }

  const statusChanceRequest = eligible ? contactStatusChanceRequestCanonical(targetAbility) : null;
  const effectSporeStatusChanceRequest = eligible
    ? effectSporeStatusChanceRequestCanonical({ user, userAbility, userItem, targetAbility })
    : null;
  const offensiveStatusChanceRequest = eligible ? offensiveContactStatusChanceRequestCanonical(userAbility) : null;
  const statChanges = eligible ? contactStatChangesCanonical(targetAbility) : Object.freeze([]);
  const rawHpDelta = effects.reduce((sum, effect) => sum + Number(effect.hpDelta ?? 0), 0);
  const reflectedDamage = Math.min(userHp, Math.max(0, -rawHpDelta));
  const userHpDelta = reflectedDamage > 0 ? -reflectedDamage : 0;
  return Object.freeze({
    boundary: "action_after",
    contact,
    hit,
    userAbility,
    userItem,
    targetAbility,
    targetItem,
    protectedFromContactEffects,
    magicGuard,
    triggered: effects.some((effect) => effect.hpDelta < 0)
      || statusChanceRequest !== null
      || effectSporeStatusChanceRequest !== null
      || offensiveStatusChanceRequest !== null
      || statChanges.length > 0,
    userHpDelta,
    effects: Object.freeze(effects),
    statusChanceRequest,
    effectSporeStatusChanceRequest,
    offensiveStatusChanceRequest,
    statChanges,
  });
}

const ABILITY_IDS = Object.freeze([
  ...CONTACT_REACTIVE_ABILITIES,
  ...Object.keys(CONTACT_STATUS_CHANCE_BY_ABILITY),
  ...Object.keys(MULTI_STATUS_CONTACT_ABILITIES),
  ...Object.keys(OFFENSIVE_CONTACT_STATUS_CHANCE_BY_ABILITY),
  ...Object.keys(CONTACT_STAT_STAGE_BY_ABILITY),
  ...CONTACT_SUPPRESSING_ABILITIES,
].sort());
const ITEM_IDS = Object.freeze([
  ...CONTACT_REACTIVE_ITEMS,
  ...CONTACT_SUPPRESSING_ITEMS,
].sort());

export const BATTLE_CONTACT_REACTIVE_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: ABILITY_IDS,
  itemIds: ITEM_IDS,
  abilityCount: ABILITY_IDS.length,
  itemCount: ITEM_IDS.length,
  classificationCounts: Object.freeze({
    contactReactiveAbilities: CONTACT_REACTIVE_ABILITIES.size,
    contactStatusChanceAbilities: Object.keys(CONTACT_STATUS_CHANCE_BY_ABILITY).length,
    multiStatusContactAbilities: Object.keys(MULTI_STATUS_CONTACT_ABILITIES).length,
    offensiveContactStatusChanceAbilities: Object.keys(OFFENSIVE_CONTACT_STATUS_CHANCE_BY_ABILITY).length,
    contactStatStageAbilities: Object.keys(CONTACT_STAT_STAGE_BY_ABILITY).length,
    contactSuppressingAbilities: CONTACT_SUPPRESSING_ABILITIES.size,
    contactReactiveHeldItems: CONTACT_REACTIVE_ITEMS.size,
    contactSuppressingHeldItems: CONTACT_SUPPRESSING_ITEMS.size,
  }),
});
