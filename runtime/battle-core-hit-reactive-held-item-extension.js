import {
  battlePokemonAbilityIdCanonical,
  battlePokemonHeldItemIdCanonical,
} from "./battle-core-ability-item-modifiers.js";
import { isCanonicalFixedDamageFunction } from "./battle-core-hp-function-effects.js";

const WEAKNESS_POLICY = "WEAKNESSPOLICY";
const TYPE_HIT_STAT_ITEMS = Object.freeze({
  ABSORBBULB: Object.freeze({ type: "WATER", stat: "SPECIAL_ATTACK", delta: 1 }),
  CELLBATTERY: Object.freeze({ type: "ELECTRIC", stat: "ATTACK", delta: 1 }),
  LUMINOUSMOSS: Object.freeze({ type: "WATER", stat: "SPECIAL_DEFENSE", delta: 1 }),
  SNOWBALL: Object.freeze({ type: "ICE", stat: "ATTACK", delta: 1 }),
});
const ITEM_IDS = Object.freeze([WEAKNESS_POLICY, ...Object.keys(TYPE_HIT_STAT_ITEMS)].sort());

function canonicalId(value) {
  const raw = typeof value === "string" ? value : value?.id;
  return String(raw ?? "").toUpperCase();
}

function stageValue(context, stat) {
  const raw = context?.targetStatStages?.[stat] ?? context?.target_stat_stages?.[stat];
  if (raw === undefined || raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.max(-6, Math.min(6, Math.trunc(value))) : null;
}

function heldItemSuppressedCanonical(target = {}, context = {}) {
  return battlePokemonAbilityIdCanonical(target) === "KLUTZ"
    || Boolean(context?.itemSuppressed)
    || Boolean(context?.magicRoomActive)
    || Boolean(context?.embargoActive);
}

function consumeRequest(item, effectKind) {
  return Object.freeze({
    item,
    itemIsBerry: false,
    effectKind,
    permanent: true,
  });
}

function targetStatChange(stat, delta) {
  return Object.freeze({ subject: "target", stat, delta });
}

export function resolveHitReactiveHeldItemActionAfterCanonical({ target = {}, move = {}, damageDealt = 0, context = {} } = {}) {
  const item = battlePokemonHeldItemIdCanonical(target);
  const moveType = canonicalId(move?.type);
  const category = String(move?.category ?? "Status");
  const damagingMove = category !== "Status";
  const damage = Math.max(0, Number(damageDealt ?? 0));
  const hit = context?.hit === true || damage > 0;
  const suppressed = heldItemSuppressedCanonical(target, context);
  const typeMod = Number(context?.typeMod ?? context?.type_mod ?? 1);
  const fixedDamage = isCanonicalFixedDamageFunction(move?.function_code);

  if (!ITEM_IDS.includes(item) || suppressed || !damagingMove || !hit || damage <= 0) {
    return Object.freeze({
      boundary: "action_after",
      item,
      moveType,
      triggered: false,
      suppressed,
      statChanges: Object.freeze([]),
      consumeRequest: null,
    });
  }

  if (item === WEAKNESS_POLICY) {
    const attackStage = stageValue(context, "ATTACK");
    const specialAttackStage = stageValue(context, "SPECIAL_ATTACK");
    const bothCapped = attackStage === 6 && specialAttackStage === 6;
    const triggered = Number.isFinite(typeMod) && typeMod > 1 && !fixedDamage && !bothCapped;
    const statChanges = triggered
      ? Object.freeze([
          targetStatChange("ATTACK", 2),
          targetStatChange("SPECIAL_ATTACK", 2),
        ])
      : Object.freeze([]);
    return Object.freeze({
      boundary: "action_after",
      item,
      moveType,
      triggered,
      suppressed: false,
      statChanges,
      consumeRequest: triggered ? consumeRequest(item, "weakness_policy") : null,
    });
  }

  const rule = TYPE_HIT_STAT_ITEMS[item];
  const capped = stageValue(context, rule.stat) === 6;
  const triggered = moveType === rule.type && !capped;
  return Object.freeze({
    boundary: "action_after",
    item,
    moveType,
    triggered,
    suppressed: false,
    statChanges: triggered ? Object.freeze([targetStatChange(rule.stat, rule.delta)]) : Object.freeze([]),
    consumeRequest: triggered ? consumeRequest(item, "type_hit_stat_boost") : null,
  });
}

export const BATTLE_HIT_REACTIVE_HELD_ITEM_COVERAGE_CANONICAL = Object.freeze({
  itemIds: ITEM_IDS,
  itemCount: ITEM_IDS.length,
  classificationCounts: Object.freeze({
    superEffectiveStatItems: 1,
    typeHitStatItems: Object.keys(TYPE_HIT_STAT_ITEMS).length,
    hitConsumedHeldItems: ITEM_IDS.length,
  }),
});
