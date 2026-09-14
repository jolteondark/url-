import { createPokemonRuntime } from "./pokemon-runtime.js";

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

function cloneMoves(moves) {
  return moves.map((move) => (typeof move === "string" ? move : structuredClone(move)));
}

/**
 * Shared commit seam for canonical v0.9.108 move-learning mutations.
 *
 * Selection/eligibility/RNG remain with the calling canonical owner. This seam only
 * commits an already-selected move to one Pokemon, matching pbLearnMove's mutation
 * boundary: add when fewer than four moves are known; otherwise require an explicit
 * replacement choice. A cancelled replacement never mutates the Pokemon.
 */
export function commitCanonicalMoveLearnV108(pokemon, operation) {
  const current = createPokemonRuntime(pokemon);
  const intent = operation && typeof operation === "object" ? structuredClone(operation) : null;
  if (!intent || intent.op !== "learn_move") {
    return { success:false, result:"learn_move_intent_required", pokemon:current, operation:intent };
  }

  const learnedMoveId = String(intent.move_id ?? "");
  if (!learnedMoveId) throw new TypeError("learn_move move_id must be a non-empty id");

  const currentMoves = cloneMoves(current.moves ?? []);
  const currentMoveIds = currentMoves.map(moveId);
  if (currentMoveIds.includes(learnedMoveId)) {
    return {
      success:false,
      result:"move_already_known",
      pokemon:current,
      operation:intent,
      moveId:learnedMoveId,
    };
  }

  if (currentMoves.length < 4) {
    const learned = createPokemonRuntime({ ...current, moves:[...currentMoves, learnedMoveId] });
    return {
      success:true,
      result:"move_learned",
      pokemon:learned,
      operation:intent,
      moveId:learnedMoveId,
      replacedMoveId:null,
      replacementIndex:null,
    };
  }

  if (intent.cancelled === true) {
    return {
      success:false,
      result:"move_learn_cancelled",
      pokemon:current,
      operation:intent,
      moveId:learnedMoveId,
    };
  }

  if (intent.replacement_index == null) {
    return {
      success:false,
      result:"move_replacement_required",
      pokemon:current,
      operation:intent,
      moveId:learnedMoveId,
      replacementChoices:currentMoveIds,
    };
  }

  const replacementIndex = Number(intent.replacement_index);
  if (!Number.isInteger(replacementIndex) || replacementIndex < 0 || replacementIndex >= currentMoves.length) {
    throw new RangeError("learn_move replacement_index must select a current move");
  }

  const replacedMoveId = currentMoveIds[replacementIndex];
  const nextMoves = cloneMoves(currentMoves);
  nextMoves[replacementIndex] = learnedMoveId;
  const learned = createPokemonRuntime({ ...current, moves:nextMoves });
  return {
    success:true,
    result:"move_replaced",
    pokemon:learned,
    operation:intent,
    moveId:learnedMoveId,
    replacedMoveId,
    replacementIndex,
  };
}
