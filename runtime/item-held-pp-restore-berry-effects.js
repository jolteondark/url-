import { applyBerryConsumptionSuppressionCanonical } from "./battle-core-berry-consumption-suppression-extension.js";
import { materializePokemonMoveRuntime, pokemonMoveTotalPp } from "./pokemon-runtime.js";

export const HELD_PP_RESTORE_BERRY_SOURCE_CANONICAL = Object.freeze({
  canonical: "Mapless v0.9.108 / Essentials v21.1 Battle::ItemEffects::OnEndOfUsingMove(:LEPPABERRY) + Gen9 Pack :HOPOBERRY copy",
  mechanicsGeneration: 9,
  baseRestore: 10,
  ripenMultiplier: 2,
});

export const HELD_PP_RESTORE_BERRY_ITEM_IDS_CANONICAL = Object.freeze(["LEPPABERRY", "HOPOBERRY"]);

function id(value) {
  if (value && typeof value === "object") return String(value.id ?? value.ID ?? value.name ?? "").trim().toUpperCase();
  return String(value ?? "").trim().toUpperCase();
}

function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

function abilityId(pokemon) {
  if (hasOwn(pokemon, "ability")) return id(pokemon.ability);
  return id(pokemon?.ability_id);
}

function heldItemId(pokemon) {
  if (hasOwn(pokemon, "held_item")) return id(pokemon.held_item);
  return id(pokemon?.item);
}

function moveId(move) {
  return id(typeof move === "string" ? move : move?.id);
}

function moveStateCanonical(pokemon, index, moveMasters) {
  const raw = pokemon?.moves?.[index];
  const move = moveId(raw);
  if (!move) return null;
  const master = moveMasters?.[move];
  const baseTotalPp = Number(master?.total_pp);
  if (!Number.isInteger(baseTotalPp) || baseTotalPp <= 0) return null;
  const runtime = materializePokemonMoveRuntime(raw, baseTotalPp);
  const totalPp = pokemonMoveTotalPp(baseTotalPp, Number(runtime.ppup ?? 0));
  return Object.freeze({ index, moveId: move, pp: Number(runtime.pp), totalPp, runtime });
}

function activeOpposingPokemon(pokemon) {
  return Number(pokemon?.hp ?? 0) > 0 ? pokemon : {};
}

export function heldPpRestoreBerryItemIdCanonical(pokemon = {}) {
  if (pokemon?.held_item_effect_suppressed === true || abilityId(pokemon) === "KLUTZ") return null;
  const item = heldItemId(pokemon);
  return HELD_PP_RESTORE_BERRY_ITEM_IDS_CANONICAL.includes(item) ? item : null;
}

export function resolvedBattlerCompletedMoveCanonical(resolved, battlerIndex) {
  const rounds = resolved?.battleRuntimeIntegration?.combatTrace?.rounds ?? [];
  for (const round of rounds) {
    for (const action of round?.actions ?? []) {
      if (Number(action?.battlerIndex) !== Number(battlerIndex)) continue;
      if (action?.kind && action.kind !== "move") continue;
      if (!action?.moveId) continue;
      return action?.moveSkipped !== true;
    }
  }
  return false;
}

export function resolveHeldPpRestoreBerryCanonical({
  pokemon = {},
  opposingPokemon = {},
  moveMasters = {},
  completedMove = false,
  activeAtTrigger = null,
} = {}) {
  const item = heldPpRestoreBerryItemIdCanonical(pokemon);
  if (!item) {
    return Object.freeze({
      boundary: "end_of_using_move",
      triggered: false,
      item: null,
      moveIndex: null,
      moveId: null,
      ppBefore: null,
      ppAfter: null,
      restoreAmount: 0,
      consumeRequest: null,
      reason: "no_active_pp_restore_berry",
    });
  }
  const active = activeAtTrigger === null || activeAtTrigger === undefined
    ? Number(pokemon?.hp ?? 0) > 0
    : Boolean(activeAtTrigger);
  if (!active) {
    return Object.freeze({ boundary: "end_of_using_move", triggered: false, item, moveIndex: null, moveId: null, ppBefore: null, ppAfter: null, restoreAmount: 0, consumeRequest: null, reason: "fainted" });
  }
  if (!completedMove) {
    return Object.freeze({ boundary: "end_of_using_move", triggered: false, item, moveIndex: null, moveId: null, ppBefore: null, ppAfter: null, restoreAmount: 0, consumeRequest: null, reason: "move_not_completed" });
  }

  let empty = null;
  for (let index = 0; index < (pokemon.moves?.length ?? 0); index += 1) {
    const state = moveStateCanonical(pokemon, index, moveMasters);
    if (state && state.pp === 0) {
      empty = state;
      break;
    }
  }
  if (!empty) {
    return Object.freeze({ boundary: "end_of_using_move", triggered: false, item, moveIndex: null, moveId: null, ppBefore: null, ppAfter: null, restoreAmount: 0, consumeRequest: null, reason: "no_zero_pp_move" });
  }

  const ripen = abilityId(pokemon) === "RIPEN";
  const requested = HELD_PP_RESTORE_BERRY_SOURCE_CANONICAL.baseRestore * (ripen ? HELD_PP_RESTORE_BERRY_SOURCE_CANONICAL.ripenMultiplier : 1);
  const ppAfter = Math.min(empty.totalPp, empty.pp + requested);
  const base = Object.freeze({
    boundary: "end_of_using_move",
    triggered: true,
    item,
    moveIndex: empty.index,
    moveId: empty.moveId,
    ppBefore: empty.pp,
    ppAfter,
    totalPp: empty.totalPp,
    restoreAmount: ppAfter - empty.pp,
    ripen,
    consumeRequest: Object.freeze({ item, reason: "held_pp_restore_berry" }),
    reason: "restore_zero_pp_move",
  });
  const suppressed = applyBerryConsumptionSuppressionCanonical(base, {
    consumer: pokemon,
    opposing: activeOpposingPokemon(opposingPokemon),
  });
  if (!suppressed.blockedByBerrySuppression) return suppressed;
  return Object.freeze({ ...suppressed, ppAfter: empty.pp, restoreAmount: 0, reason: "blocked_by_unnerve" });
}

export function commitHeldPpRestoreBerryCanonical(input = {}) {
  const pokemon = structuredClone(input.pokemon ?? {});
  const resolution = resolveHeldPpRestoreBerryCanonical(input);
  if (!resolution.triggered) return Object.freeze({ pokemon, resolution });

  const index = Number(resolution.moveIndex);
  const raw = pokemon.moves[index];
  if (typeof raw === "string") {
    pokemon.moves[index] = { id: raw, ppup: 0, pp: Number(resolution.ppAfter) };
  } else {
    pokemon.moves[index] = { ...raw, pp: Number(resolution.ppAfter) };
  }
  if (hasOwn(pokemon, "held_item")) pokemon.held_item = null;
  if (hasOwn(pokemon, "item")) pokemon.item = null;
  return Object.freeze({ pokemon, resolution });
}

export const BATTLE_HELD_PP_RESTORE_BERRY_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze(["RIPEN"]),
  itemIds: HELD_PP_RESTORE_BERRY_ITEM_IDS_CANONICAL,
  abilityCount: 1,
  itemCount: HELD_PP_RESTORE_BERRY_ITEM_IDS_CANONICAL.length,
  classificationCounts: Object.freeze({ automaticHeldPpRestoreBerries: HELD_PP_RESTORE_BERRY_ITEM_IDS_CANONICAL.length }),
});
