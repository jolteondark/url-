import { pokemonMoveTotalPp } from "./pokemon-runtime.js";
import { resolveBerryConsumptionSuppressionCanonical } from "./battle-core-berry-consumption-suppression-extension.js";

export const HELD_PP_RESTORE_BERRIES_CANONICAL = Object.freeze({
  LEPPABERRY: 10,
  HOPOBERRY: 10,
});

export const HELD_PP_RESTORE_BERRY_ITEM_IDS_CANONICAL = Object.freeze(Object.keys(HELD_PP_RESTORE_BERRIES_CANONICAL).sort());

function id(value) {
  if (value && typeof value === "object") return String(value.id ?? value.ID ?? value.name ?? "").trim().toUpperCase();
  return String(value ?? "").trim().toUpperCase();
}

function heldItemId(pokemon) {
  if (pokemon && Object.prototype.hasOwnProperty.call(pokemon, "held_item")) return id(pokemon.held_item);
  return id(pokemon?.item);
}

function abilityId(pokemon) {
  if (pokemon && Object.prototype.hasOwnProperty.call(pokemon, "ability")) return id(pokemon.ability);
  return id(pokemon?.ability_id);
}

function baseTotalPpAt(context, moveIndex) {
  const map = context?.baseTotalPpByIndex ?? context?.moveBaseTotalPpByIndex ?? {};
  const raw = map?.[moveIndex] ?? map?.[String(moveIndex)];
  if (raw == null) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function totalPpForMove(move, context, moveIndex) {
  const explicit = Number(move?.total_pp ?? move?.totalPp);
  if (Number.isInteger(explicit) && explicit > 0) return { totalPp: explicit, baseTotalPp: null };
  const baseTotalPp = baseTotalPpAt(context, moveIndex);
  if (baseTotalPp == null || baseTotalPp <= 0) return { totalPp: null, baseTotalPp: null };
  return { totalPp: pokemonMoveTotalPp(baseTotalPp, Number(move?.ppup ?? 0)), baseTotalPp };
}

function itemActiveCanonical(pokemon, context) {
  if (context?.itemActive === false) return false;
  if (context?.embargo === true || Number(context?.embargoTurns ?? 0) > 0) return false;
  if (context?.magicRoom === true || Number(context?.magicRoomTurns ?? 0) > 0) return false;
  return abilityId(pokemon) !== "KLUTZ";
}

export function resolveHeldPpRestoreBerryAfterMoveCanonical({ pokemon = {}, opposing = {}, context = {}, forced = false } = {}) {
  const item = heldItemId(pokemon);
  const baseRestore = HELD_PP_RESTORE_BERRIES_CANONICAL[item] ?? null;
  const moves = Array.isArray(pokemon?.moves) ? pokemon.moves : [];
  if (baseRestore == null) return Object.freeze({ item, triggered: false, reason: "not_pp_restore_berry", consumeRequest: null });
  if (!forced && !itemActiveCanonical(pokemon, context)) {
    return Object.freeze({ item, triggered: false, reason: "item_inactive", consumeRequest: null });
  }
  if (!forced) {
    const suppression = resolveBerryConsumptionSuppressionCanonical({ consumer: pokemon, opposing, context });
    if (suppression.blocked) {
      return Object.freeze({ item, triggered: false, reason: "berry_consumption_blocked", berryConsumptionSuppression: suppression, consumeRequest: null });
    }
  }

  for (let moveIndex = 0; moveIndex < moves.length; moveIndex += 1) {
    const move = moves[moveIndex];
    const pp = Number(move?.pp);
    if (!Number.isInteger(pp) || pp !== 0) continue;
    const totals = totalPpForMove(move, context, moveIndex);
    if (totals.totalPp == null) {
      return Object.freeze({ item, triggered: false, reason: "unknown_total_pp", moveIndex, consumeRequest: null });
    }
    if (totals.totalPp <= 0) continue;
    const ripen = abilityId(pokemon) === "RIPEN";
    const restoredPp = Math.min(totals.totalPp, baseRestore * (ripen ? 2 : 1));
    return Object.freeze({
      item,
      triggered: restoredPp > 0,
      reason: restoredPp > 0 ? "pp_restore" : "no_pp_restore",
      moveIndex,
      moveId: id(move?.id),
      ppBefore: 0,
      ppAfter: restoredPp,
      totalPp: totals.totalPp,
      baseTotalPp: totals.baseTotalPp,
      ripen,
      consumeRequest: restoredPp > 0
        ? Object.freeze({ item, itemIsBerry: true, effectKind: "pp_restore" })
        : null,
    });
  }
  return Object.freeze({ item, triggered: false, reason: "no_zero_pp_move", consumeRequest: null });
}

export const BATTLE_HELD_PP_RESTORE_BERRY_COVERAGE_CANONICAL = Object.freeze({
  itemIds: HELD_PP_RESTORE_BERRY_ITEM_IDS_CANONICAL,
  itemCount: HELD_PP_RESTORE_BERRY_ITEM_IDS_CANONICAL.length,
  abilityIds: Object.freeze(["RIPEN"]),
  abilityCount: 1,
  classificationCounts: Object.freeze({ automaticPpRestoreBerries: HELD_PP_RESTORE_BERRY_ITEM_IDS_CANONICAL.length }),
});
