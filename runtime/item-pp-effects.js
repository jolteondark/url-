import { materializePokemonMoveRuntime, pokemonMoveTotalPp } from "./pokemon-runtime.js";

export const PP_ITEM_EFFECT_SOURCE = Object.freeze({
  canonical: "Mapless v0.9.108 / Essentials v21.1 Item_Utilities + Item_Effects + Item_BattleEffects",
  mechanicsGeneration: 9,
});

export const PP_ITEM_EFFECTS = Object.freeze({
  ETHER: Object.freeze({ kind: "single_restore", amount: 10, battle: true }),
  LEPPABERRY: Object.freeze({ kind: "single_restore", amount: 10, battle: true }),
  HOPOBERRY: Object.freeze({ kind: "single_restore", amount: 10, battle: true }),
  MAXETHER: Object.freeze({ kind: "single_restore", full: true, battle: true }),
  ELIXIR: Object.freeze({ kind: "all_restore", amount: 10, battle: true }),
  MAXELIXIR: Object.freeze({ kind: "all_restore", full: true, battle: true }),
  PPUP: Object.freeze({ kind: "pp_up", amount: 1, battle: false }),
  PPMAX: Object.freeze({ kind: "pp_up", maximum: true, battle: false }),
});

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

function moveState(pokemon, index, moveMasters) {
  if (!pokemon || !Array.isArray(pokemon.moves) || !Number.isInteger(index) || index < 0 || index >= pokemon.moves.length) return null;
  const raw = pokemon.moves[index];
  const id = moveId(raw);
  if (!id) return null;
  const master = moveMasters?.[id];
  const baseTotalPp = Number(master?.total_pp);
  if (!Number.isInteger(baseTotalPp) || baseTotalPp < 0) return null;
  const move = materializePokemonMoveRuntime(raw, baseTotalPp);
  const ppup = Number(move.ppup ?? 0);
  const totalPp = pokemonMoveTotalPp(baseTotalPp, ppup);
  return { index, id, baseTotalPp, move, pp: Number(move.pp), ppup, totalPp };
}

export function isPpItem(itemId) {
  return Object.prototype.hasOwnProperty.call(PP_ITEM_EFFECTS, String(itemId ?? "").toUpperCase());
}

export function isPpItemUsableInContext(itemId, context = "field") {
  const effect = PP_ITEM_EFFECTS[String(itemId ?? "").toUpperCase()];
  if (!effect) return false;
  if (context === "field") return true;
  return context === "battle" && effect.battle === true;
}

export function ppItemNeedsMoveSelection(itemId, context = "field") {
  const id = String(itemId ?? "").toUpperCase();
  const effect = PP_ITEM_EFFECTS[id];
  return Boolean(effect && isPpItemUsableInContext(id, context) && ["single_restore", "pp_up"].includes(effect.kind));
}

function moveCanReceive(effect, state) {
  if (!state) return false;
  if (effect.kind === "single_restore" || effect.kind === "all_restore") return state.totalPp > 0 && state.pp < state.totalPp;
  if (effect.kind === "pp_up") return state.totalPp > 1 && state.ppup < 3;
  return false;
}

export function ppItemMoveOptions({ itemId, pokemon, moveMasters, context = "field" } = {}) {
  const id = String(itemId ?? "").toUpperCase();
  const effect = PP_ITEM_EFFECTS[id];
  if (!effect || !isPpItemUsableInContext(id, context) || !pokemon || !Array.isArray(pokemon.moves)) return [];
  return pokemon.moves.map((_, index) => {
    const state = moveState(pokemon, index, moveMasters);
    return state ? Object.freeze({
      index,
      id: state.id,
      pp: state.pp,
      totalPp: state.totalPp,
      ppup: state.ppup,
      usable: moveCanReceive(effect, state),
    }) : Object.freeze({ index, id: moveId(pokemon.moves[index]) ?? null, pp: null, totalPp: null, ppup: null, usable: false });
  });
}

export function ppItemCanAffectPokemon({ itemId, pokemon, moveMasters, context = "field", moveIndex = undefined } = {}) {
  const id = String(itemId ?? "").toUpperCase();
  const effect = PP_ITEM_EFFECTS[id];
  if (!effect || !isPpItemUsableInContext(id, context) || !pokemon || Number(pokemon.steps_to_hatch ?? 0) > 0) return false;
  if (context === "battle" && Number(pokemon.hp ?? 0) <= 0) return false;
  const options = ppItemMoveOptions({ itemId: id, pokemon, moveMasters, context });
  if (effect.kind === "all_restore") return options.some((option) => option.usable);
  if (moveIndex === undefined || moveIndex === null) return options.some((option) => option.usable);
  const index = Number(moveIndex);
  return Number.isInteger(index) && options[index]?.usable === true;
}

export function resolvePpItemEffect({ itemId, pokemon, moveMasters, context = "field", moveIndex = undefined } = {}) {
  const id = String(itemId ?? "").toUpperCase();
  const effect = PP_ITEM_EFFECTS[id];
  if (!effect) return { used: false, result: "unsupported_item" };
  if (!isPpItemUsableInContext(id, context)) return { used: false, result: "unsupported_context" };
  if (!pokemon || Number(pokemon.steps_to_hatch ?? 0) > 0) return { used: false, result: "invalid_target" };
  if (context === "battle" && Number(pokemon.hp ?? 0) <= 0) return { used: false, result: "fainted_target" };

  const moves = pokemon.moves.map((move) => (typeof move === "string" ? move : { ...move }));
  const changes = [];
  const applyAt = (index) => {
    const state = moveState(pokemon, index, moveMasters);
    if (!moveCanReceive(effect, state)) return false;
    const next = { ...state.move };
    const before = {
      moveIndex: index,
      moveId: state.id,
      ppBefore: state.pp,
      ppupBefore: state.ppup,
      totalPpBefore: state.totalPp,
    };
    if (effect.kind === "single_restore" || effect.kind === "all_restore") {
      next.pp = effect.full ? state.totalPp : Math.min(state.totalPp, state.pp + effect.amount);
    } else if (effect.kind === "pp_up") {
      next.ppup = effect.maximum ? 3 : Math.min(3, state.ppup + effect.amount);
      next.pp = state.pp;
    }
    const totalPpAfter = pokemonMoveTotalPp(state.baseTotalPp, Number(next.ppup ?? 0));
    moves[index] = next;
    changes.push(Object.freeze({
      ...before,
      ppAfter: Number(next.pp),
      ppupAfter: Number(next.ppup ?? 0),
      totalPpAfter,
    }));
    return true;
  };

  if (effect.kind === "all_restore") {
    for (let index = 0; index < moves.length; index += 1) applyAt(index);
  } else {
    const index = Number(moveIndex);
    if (!Number.isInteger(index) || index < 0 || index >= moves.length) return { used: false, result: "invalid_move" };
    applyAt(index);
  }
  if (changes.length === 0) return { used: false, result: "no_effect" };
  return {
    used: true,
    result: "used",
    itemId: id,
    moveIndex: effect.kind === "all_restore" ? null : Number(moveIndex),
    moves,
    changes: Object.freeze(changes),
  };
}
