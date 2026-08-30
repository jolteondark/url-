import {
  battlePokemonAbilityIdCanonical,
  battlePokemonHeldItemIdCanonical,
} from "./battle-core-ability-item-modifiers.js";

const PINCH_HEAL_BERRIES = new Set([
  "FIGYBERRY", "WIKIBERRY", "MAGOBERRY", "AGUAVBERRY", "IAPAPABERRY",
]);
const PINCH_STAT_BERRIES = Object.freeze({
  LIECHIBERRY: "ATTACK",
  GANLONBERRY: "DEFENSE",
  PETAYABERRY: "SPECIAL_ATTACK",
  APICOTBERRY: "SPECIAL_DEFENSE",
  SALACBERRY: "SPEED",
});

function integerHp(pokemon, key, fallback = 0) {
  const value = key === "maxHp" ? (pokemon?.max_hp ?? pokemon?.maxHp) : pokemon?.[key];
  return Math.max(0, Math.trunc(Number(value ?? fallback)));
}

function heldItemConsumeRequest(item, effectKind, itemIsBerry, previous = null) {
  return Object.freeze({
    ...(previous ?? {}),
    item,
    itemIsBerry: Boolean(itemIsBerry),
    effectKind,
    permanent: true,
  });
}

function berryConsumeRequest(item, effectKind, previous = null) {
  return heldItemConsumeRequest(item, effectKind, true, previous);
}

function freezeStatChanges(changes = []) {
  return Object.freeze(changes.map((change) => Object.freeze({ ...change })));
}

export const BATTLE_BERRY_ABILITY_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze(["CHEEKPOUCH", "GLUTTONY", "RIPEN"]),
  abilityCount: 3,
  itemIds: Object.freeze(["BERRYJUICE"]),
  itemCount: 1,
  classificationCounts: Object.freeze({
    earlyPinchBerryAbilities: 1,
    berryEffectMultiplierAbilities: 1,
    berryConsumptionHealAbilities: 1,
    hpThresholdNonBerryConsumables: 1,
  }),
});

export function resolveBerryAbilityPreConsumptionCanonical({ pokemon = {}, berryResolution = {} } = {}) {
  const ability = battlePokemonAbilityIdCanonical(pokemon);
  const item = battlePokemonHeldItemIdCanonical(pokemon);
  const hp = integerHp(pokemon, "hp");
  const maxHp = integerHp(pokemon, "maxHp");
  const base = { ...berryResolution, item: berryResolution?.item ?? item };
  let triggered = base.triggered === true;
  let heal = Math.max(0, Math.trunc(Number(base.heal ?? 0)));
  let statChanges = [...(base.statChanges ?? [])];
  let confusionCheckRequired = Boolean(base.confusionCheckRequired);
  let consumeRequest = base.consumeRequest ?? null;

  if (!triggered && item === "BERRYJUICE" && hp > 0 && maxHp > 0 && hp * 2 <= maxHp) {
    heal = Math.min(Math.max(0, maxHp - hp), 20);
    triggered = heal > 0;
    consumeRequest = triggered ? heldItemConsumeRequest(item, "hp_restore", false) : null;
  }

  if (!triggered && ability === "GLUTTONY" && hp > 0 && maxHp > 0 && hp * 2 <= maxHp) {
    if (PINCH_HEAL_BERRIES.has(item)) {
      heal = Math.min(maxHp - hp, Math.max(1, Math.floor(maxHp / 3)));
      triggered = heal > 0;
      confusionCheckRequired = triggered;
      consumeRequest = triggered ? berryConsumeRequest(item, "hp_restore") : null;
    } else if (PINCH_STAT_BERRIES[item]) {
      statChanges = [{ subject: "user", stat: PINCH_STAT_BERRIES[item], delta: 1 }];
      triggered = true;
      consumeRequest = berryConsumeRequest(item, "stat_raise");
    }
  }

  if (triggered && ability === "RIPEN" && item.endsWith("BERRY")) {
    if (heal > 0) heal = Math.min(Math.max(0, maxHp - hp), heal * 2);
    if (statChanges.length > 0) {
      statChanges = statChanges.map((change) => ({ ...change, delta: Math.trunc(Number(change.delta ?? 0)) * 2 }));
    }
  }

  if (triggered && item.endsWith("BERRY")) {
    const effectKind = consumeRequest?.effectKind ?? (heal > 0 ? "hp_restore" : (statChanges.length > 0 ? "stat_raise" : "berry_effect"));
    consumeRequest = berryConsumeRequest(item, effectKind, consumeRequest);
  }

  return Object.freeze({
    ...base,
    triggered,
    heal,
    statChanges: freezeStatChanges(statChanges),
    confusionCheckRequired,
    consumeRequest,
    berryAbility: ability === "GLUTTONY" || ability === "RIPEN" ? ability : null,
  });
}

export function resolveBerryAbilityPostConsumptionCanonical({ pokemon = {}, berryResolution = {} } = {}) {
  const ability = battlePokemonAbilityIdCanonical(pokemon);
  const hp = integerHp(pokemon, "hp");
  const maxHp = integerHp(pokemon, "maxHp");
  const consumedBerry = berryResolution?.triggered === true && berryResolution?.consumeRequest?.itemIsBerry === true;
  if (ability !== "CHEEKPOUCH" || !consumedBerry || hp <= 0 || maxHp <= 0) {
    return Object.freeze({ boundary: "action_after", ability, triggered: false, hpDelta: 0, source: null });
  }
  const ordinaryHeal = Math.max(0, Math.trunc(Number(berryResolution?.heal ?? 0)));
  const projectedHp = Math.min(maxHp, hp + ordinaryHeal);
  const hpDelta = Math.min(Math.max(0, maxHp - projectedHp), Math.max(1, Math.floor(maxHp / 3)));
  return Object.freeze({
    boundary: "action_after",
    ability,
    triggered: hpDelta > 0,
    hpDelta,
    source: hpDelta > 0 ? "CHEEKPOUCH" : null,
  });
}
