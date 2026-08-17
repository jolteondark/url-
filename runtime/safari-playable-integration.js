import * as playable from "./safari-playable-integration-boundary-return.js";
import { stabilizeSafariKoPresentation } from "./safari-ko-presentation-safety.js";

export * from "./safari-playable-integration-boundary-return.js";
export { activateSafariDayBoardCell } from "./safari-pokemon-center-command.js";
export { attemptSafariCapture } from "./safari-capture-command.js";
export { safariShopPresentation } from "./safari-shop-display-presentation.js";

function notifySafariRuntimeChanged() {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
  queueMicrotask(() => window.dispatchEvent(new CustomEvent("safari-runtime-changed")));
}

function finalizeSafariRoundPresentation(result) {
  const stabilized = stabilizeSafariKoPresentation(result);
  // Battle state is already committed at this boundary. Notify the scene-demand
  // projections explicitly instead of inferring state from DOM mutations.
  notifySafariRuntimeChanged();
  return stabilized;
}

export function resolveSafariBattleRound(runtime, selectedMoveId) {
  const result = playable.resolveSafariBattleRound(runtime, selectedMoveId);
  if (result && typeof result.then === "function") {
    return result.then((resolved) => finalizeSafariRoundPresentation(resolved));
  }
  return finalizeSafariRoundPresentation(result);
}
