import {
  battlePokemonAbilityIdCanonical,
  battlePokemonHeldItemIdCanonical,
} from "./battle-core-ability-item-modifiers.js";

const AIR_BALLOON = "AIRBALLOON";

function canonicalId(value) {
  const raw = typeof value === "string" ? value : value?.id;
  return String(raw ?? "").toUpperCase();
}

function airBalloonSuppressedCanonical(pokemon = {}, context = {}) {
  return battlePokemonAbilityIdCanonical(pokemon) === "KLUTZ"
    || Boolean(context?.itemSuppressed)
    || Boolean(context?.magicRoomActive)
    || Boolean(context?.embargoActive);
}

export function resolveAirBalloonActionBeforeCanonical({ target = {}, move = {}, context = {} } = {}) {
  const item = battlePokemonHeldItemIdCanonical(target);
  const moveType = canonicalId(move?.type);
  const suppressed = airBalloonSuppressedCanonical(target, context);
  const grounded = Boolean(context?.grounded || context?.gravityActive || context?.ingrainActive || context?.smackDownActive);
  const immune = item === AIR_BALLOON && moveType === "GROUND" && !suppressed && !grounded;
  return Object.freeze({
    boundary: "action_before",
    item,
    moveType,
    suppressed,
    grounded,
    immune,
    typeImmunityResolution: immune
      ? Object.freeze({
          immune: true,
          source: "held_item_air_balloon",
          item: AIR_BALLOON,
          afterEffect: null,
        })
      : null,
  });
}

export function resolveAirBalloonActionAfterCanonical({ target = {}, move = {}, damageDealt = 0, context = {} } = {}) {
  const item = battlePokemonHeldItemIdCanonical(target);
  const suppressed = airBalloonSuppressedCanonical(target, context);
  const damagingMove = String(move?.category ?? "Status") !== "Status";
  const hit = context?.hit === true || Number(damageDealt ?? 0) > 0;
  const triggered = item === AIR_BALLOON && !suppressed && damagingMove && hit;
  return Object.freeze({
    boundary: "action_after",
    item,
    suppressed,
    triggered,
    consumeRequest: triggered
      ? Object.freeze({
          item: AIR_BALLOON,
          itemIsBerry: false,
          effectKind: "air_balloon_burst",
          permanent: true,
        })
      : null,
  });
}

export const BATTLE_AIR_BALLOON_COVERAGE_CANONICAL = Object.freeze({
  itemIds: Object.freeze([AIR_BALLOON]),
  itemCount: 1,
  classificationCounts: Object.freeze({
    typeImmunityHeldItems: 1,
    hitConsumedHeldItems: 1,
  }),
});
