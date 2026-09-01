import { persistSafariOwnerResult } from "./runtime/safari-owner-result-persistence.js";
import { openSafariBountyPosterTouch, resolveSafariBountyPosterInteraction } from "./runtime/safari-bounty-poster-interaction.js";

let resolving = false;

function runtime() { return globalThis.__maplessSafariRuntime ?? null; }
function activeBountyUi() {
  const current = runtime();
  const active = globalThis.__maplessNormalEventUi ?? null;
  return active?.runtime === current && active?.eventId === "bounty_poster" ? active : null;
}

// Presentation/delivery adapter only. Canonical event resolution, quest payload,
// RNG, and state-transition intent remain owned by resolveCanonicalNormalEvent.
document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-board-index]");
  const current = runtime();
  const state = current?.variables?.mapless;
  if (!button || !current || !state || state.location !== "day_board") return;
  const index = Number(button.dataset.boardIndex);
  const boardEvent = state.board_events?.[index];
  if (boardEvent?.kind !== "normal_event" || boardEvent.normal_event_id !== "bounty_poster") return;
  event.preventDefault();
  event.stopImmediatePropagation();
  openSafariBountyPosterTouch(current, index);
  window.dispatchEvent(new CustomEvent("safari-runtime-changed"));
}, true);

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-normal-event-action]");
  const current = runtime();
  const active = activeBountyUi();
  if (!button || !current || !active || resolving) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  resolving = true;
  try {
    const result = resolveSafariBountyPosterInteraction(current, active.boardIndex, button.dataset.normalEventAction);
    persistSafariOwnerResult(current, result, window.localStorage);
    if (result.completed) globalThis.__maplessNormalEventUi = null;
    window.dispatchEvent(new CustomEvent("safari-runtime-changed"));
  } catch (error) {
    globalThis.__maplessLastError = error;
    current.variables.mapless.notice = `イベントエラー: ${error?.message ?? error}`;
    window.dispatchEvent(new CustomEvent("safari-runtime-changed"));
  } finally {
    resolving = false;
  }
}, true);
