import { setMovePp } from "./battle-status-pp-flow.js";
import {
  battlePokemonAbilityIdCanonical,
  battlePokemonHeldItemIdCanonical,
} from "./battle-core-ability-item-modifiers.js";

function canonicalId(value) {
  const raw = typeof value === "string" ? value : value?.id;
  return String(raw ?? "").trim().toUpperCase();
}

function moveTotalPp(move) {
  const total = Number(move?.totalPp ?? move?.total_pp ?? 0);
  return Number.isFinite(total) ? Math.max(0, Math.trunc(total)) : 0;
}

function moveCurrentPp(move) {
  const pp = Number(move?.pp ?? 0);
  return Number.isFinite(pp) ? Math.max(0, Math.trunc(pp)) : 0;
}

export const BATTLE_LEPPA_BERRY_COVERAGE_CANONICAL = Object.freeze({
  itemIds: Object.freeze(["LEPPABERRY"]),
  itemCount: 1,
  classificationCounts: Object.freeze({ heldPpRestore: 1 }),
});

export function resolveLeppaBerryPpRestoreCanonical({ pokemon = {}, depletedMoveId = null } = {}) {
  const item = battlePokemonHeldItemIdCanonical(pokemon);
  const ability = battlePokemonAbilityIdCanonical(pokemon);
  const moves = Array.isArray(pokemon?.moves) ? pokemon.moves : [];
  const requestedMoveId = canonicalId(depletedMoveId);
  const moveIndex = moves.findIndex((move) => {
    if (requestedMoveId && canonicalId(move) !== requestedMoveId) return false;
    return moveCurrentPp(move) === 0 && moveTotalPp(move) > 0;
  });

  if (item !== "LEPPABERRY" || moveIndex < 0) {
    return Object.freeze({
      item,
      ability,
      triggered: false,
      moveIndex: -1,
      moveId: requestedMoveId || null,
      restoreAmount: 0,
      consumeRequest: null,
      boundary: "pp_depleted",
    });
  }

  const move = moves[moveIndex];
  const restoreAmount = Math.min(moveTotalPp(move), ability === "RIPEN" ? 20 : 10);
  return Object.freeze({
    item,
    ability,
    triggered: restoreAmount > 0,
    moveIndex,
    moveId: canonicalId(move) || null,
    restoreAmount,
    consumeRequest: restoreAmount > 0 ? Object.freeze({
      item,
      itemIsBerry: true,
      effectKind: "pp_restore",
      permanent: true,
    }) : null,
    boundary: "pp_depleted",
  });
}

export function applyLeppaBerryPpRestoreCanonical({ pokemon = {}, resolution } = {}) {
  const moves = Array.isArray(pokemon?.moves) ? pokemon.moves.map((move) => ({ ...move })) : [];
  if (!resolution?.triggered || !Number.isInteger(resolution.moveIndex) || resolution.moveIndex < 0 || resolution.moveIndex >= moves.length) {
    return Object.freeze({ pokemon: Object.freeze({ ...pokemon, moves: Object.freeze(moves) }), operations: Object.freeze([]) });
  }

  const index = resolution.moveIndex;
  const current = moveCurrentPp(moves[index]);
  const total = moveTotalPp(moves[index]);
  const restored = Math.min(total, current + Math.max(0, Math.trunc(Number(resolution.restoreAmount ?? 0))));
  moves[index] = setMovePp(moves[index], restored, Boolean(moves[index]?.transformed));
  return Object.freeze({
    pokemon: Object.freeze({ ...pokemon, moves: Object.freeze(moves) }),
    operations: Object.freeze([
      Object.freeze({ op: "held_pp_restore", moveIndex: index, moveId: resolution.moveId ?? null, pp: restored }),
      Object.freeze({ op: "runtime_pp_reflection", moveIndex: index, pp: moves[index].realMovePp ?? restored }),
    ]),
  });
}

export const BATTLE_LEPPA_BERRY_BOUNDARY_CANONICAL = Object.freeze({
  trigger: "call after the authoritative move-PP owner reduces a move to 0 PP; pass that depleted move id to avoid retargeting another empty move",
  ppMutation: "battle-status-pp-flow.setMovePp remains authoritative; this adapter only selects the canonical move and restore amount",
  consumption: "consumeRequest is committed by battle-held-item-consumption-flow; this adapter never removes the held item directly",
});
