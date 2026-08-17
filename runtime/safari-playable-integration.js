import * as playable from "./safari-playable-integration-boundary-return.js";
import { continueSafariTrainerAfterFirstKo } from "./safari-trainer-replacement-continuation.js";

export * from "./safari-playable-integration-boundary-return.js";
export { activateSafariDayBoardCell } from "./safari-pokemon-center-command.js";
export { attemptSafariCapture } from "./safari-capture-command.js";

export function resolveSafariBattleRound(runtime, selectedMoveId) {
  const result = playable.resolveSafariBattleRound(runtime, selectedMoveId);
  return continueSafariTrainerAfterFirstKo(runtime, result);
}
