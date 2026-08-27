export * from "./battle-core-browser-opponent-move-choice-base.js";

import { resolveBrowserOpponentMoveChoiceCanonical as resolveBrowserOpponentMoveChoiceBase } from "./battle-core-browser-opponent-move-choice-base.js";
import { activeChoiceSourceCanonical } from "./item-held-choice-life-orb-effects.js";

function moveId(move) {
  return String(typeof move === "string" ? move : move?.id ?? "").toUpperCase();
}

function choiceLockedFoe(foe) {
  const lockedMoveId = String(foe?.__battle_choice_locked_move_id ?? "").trim().toUpperCase();
  if (!lockedMoveId || !activeChoiceSourceCanonical(foe)) return foe;
  const moves = Array.isArray(foe?.moves) ? foe.moves : [];
  if (!moves.some((move) => moveId(move) === lockedMoveId)) return foe;
  return {
    ...foe,
    moves: moves.map((move) => {
      if (moveId(move) === lockedMoveId) return move;
      if (typeof move === "string") return { id: move, pp: 0 };
      return { ...move, pp: 0 };
    }),
  };
}

export function resolveBrowserOpponentMoveChoiceCanonical(input = {}) {
  return resolveBrowserOpponentMoveChoiceBase({
    ...input,
    foe: choiceLockedFoe(input.foe),
  });
}
