import * as playable from "./safari-playable-integration-boundary-return.js";
import { stabilizeSafariKoPresentation } from "./safari-ko-presentation-safety.js";
import { continueSafariTrainerAfterFirstKo } from "./safari-trainer-replacement-continuation.js";

export * from "./safari-playable-integration-boundary-return.js";
export { activateSafariDayBoardCell } from "./safari-pokemon-center-command.js";
export { attemptSafariCapture } from "./safari-capture-command.js";
export { safariShopPresentation } from "./safari-shop-display-presentation.js";

function finalizeSafariRoundPresentation(runtime, result) {
  const continued = continueSafariTrainerAfterFirstKo(runtime, result);
  return stabilizeSafariKoPresentation(continued);
}

export function resolveSafariBattleRound(runtime, selectedMoveId) {
  const result = playable.resolveSafariBattleRound(runtime, selectedMoveId);
  if (result && typeof result.then === "function") {
    return result.then((resolved) => finalizeSafariRoundPresentation(runtime, resolved));
  }
  return finalizeSafariRoundPresentation(runtime, result);
}
