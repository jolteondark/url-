import {
  battlePokemonAbilityIdCanonical,
  battlePokemonHeldItemIdCanonical,
} from "./battle-core-ability-item-modifiers.js";

const CONTACT_REACTIVE_ABILITIES = new Set(["ROUGHSKIN", "IRONBARBS"]);
const CONTACT_SUPPRESSING_ABILITIES = new Set(["LONGREACH"]);
const CONTACT_REACTIVE_ITEMS = new Set(["ROCKYHELMET"]);
const CONTACT_SUPPRESSING_ITEMS = new Set(["PROTECTIVEPADS"]);

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
  const eligible = contact && hit && userHp > 0 && userMaxHp > 0 && !protectedFromContactEffects;
  const effects = [];

  if (eligible && CONTACT_REACTIVE_ABILITIES.has(targetAbility)) {
    const damage = magicGuard ? 0 : fractionalDamage(userMaxHp, 8);
    effects.push(Object.freeze({
      source: targetAbility,
      sourceKind: "ability",
      hpDelta: -damage,
      suppressedByMagicGuard: magicGuard,
    }));
  }
  if (eligible && CONTACT_REACTIVE_ITEMS.has(targetItem)) {
    const damage = magicGuard ? 0 : fractionalDamage(userMaxHp, 6);
    effects.push(Object.freeze({
      source: targetItem,
      sourceKind: "held_item",
      hpDelta: -damage,
      suppressedByMagicGuard: magicGuard,
    }));
  }

  const rawHpDelta = effects.reduce((sum, effect) => sum + Number(effect.hpDelta ?? 0), 0);
  const userHpDelta = -Math.min(userHp, Math.max(0, -rawHpDelta));
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
    triggered: effects.some((effect) => effect.hpDelta < 0),
    userHpDelta,
    effects: Object.freeze(effects),
  });
}

const ABILITY_IDS = Object.freeze([
  ...CONTACT_REACTIVE_ABILITIES,
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
    contactSuppressingAbilities: CONTACT_SUPPRESSING_ABILITIES.size,
    contactReactiveHeldItems: CONTACT_REACTIVE_ITEMS.size,
    contactSuppressingHeldItems: CONTACT_SUPPRESSING_ITEMS.size,
  }),
});
