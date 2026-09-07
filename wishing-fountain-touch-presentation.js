import {
  resolveSafariWishingFountainInteraction,
  safariWishingFountainBonusCandidates,
  safariWishingFountainPresentation,
} from "./runtime/safari-wishing-fountain-final-routes.js?v=20260908-0630";
import { persistSafariOwnerResult } from "./runtime/safari-owner-result-persistence.js";

let resolving = false;
function runtime() { return globalThis.__maplessSafariRuntime ?? null; }
function activeUi() {
  const active = globalThis.__maplessNormalEventUi ?? null;
  return active?.runtime === runtime() && active?.eventId === "wishing_fountain" ? active : null;
}
function publish(name) {
  if (typeof globalThis.CustomEvent !== "function") return;
  globalThis.window?.dispatchEvent?.(new CustomEvent(name));
}
function refreshUi(current, index) {
  const state = current?.variables?.mapless;
  if (!state || state.board_consumed?.[index]) return false;
  const presentation = safariWishingFountainPresentation(current, index);
  state.notice = presentation.message;
  globalThis.__maplessNormalEventUi = {
    runtime:current,
    boardIndex:index,
    eventId:"wishing_fountain",
    title:presentation.title,
    message:presentation.message,
    actions:presentation.actions,
  };
  publish("safari-normal-event-ui");
  return true;
}
function bonusSelectionOptions(current, index, action) {
  if (action !== "large_wish") return {};
  const event = current?.variables?.mapless?.board_events?.[index];
  const roll = Number(event?.normal_data?.large_roll ?? 0);
  if (!(roll >= 45 && roll < 65)) return {};
  const candidates = safariWishingFountainBonusCandidates(current);
  if (!candidates.length) return { pokemonIndex:NaN };
  const promptFn = typeof globalThis.prompt === "function" ? globalThis.prompt.bind(globalThis) : null;
  if (!promptFn) return { pokemonIndex:candidates[0].index };
  const lines = candidates.map((entry) => `${entry.index + 1}: ${entry.species}${entry.fainted ? " (ひんし)" : ""}`);
  const raw = promptFn(`泉の力を受けるポケモンを選んでください。\n${lines.join("\n")}\nキャンセルすると強化せず願いを終えます。`, String(candidates[0].index + 1));
  if (raw == null) return { pokemonIndex:NaN };
  const chosen = Number(raw) - 1;
  return { pokemonIndex:candidates.some((entry) => entry.index === chosen) ? chosen : NaN };
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-normal-event-action]");
  const active = activeUi();
  const current = runtime();
  if (!button || !active || !current || resolving) return;
  const action = String(button.dataset.normalEventAction ?? "");
  event.preventDefault();
  event.stopImmediatePropagation();
  resolving = true;
  button.disabled = true;
  try {
    const result = await resolveSafariWishingFountainInteraction(
      current,
      active.boardIndex,
      action,
      bonusSelectionOptions(current, active.boardIndex, action),
    );
    persistSafariOwnerResult(current, result, globalThis.localStorage);
    if (result.completed || result.result === "normal_event_wild_battle_started") globalThis.__maplessNormalEventUi = null;
    else refreshUi(current, active.boardIndex);
    publish("safari-runtime-changed");
  } catch (error) {
    globalThis.__maplessLastError = error;
    const state = current?.variables?.mapless;
    if (state) state.notice = `イベントエラー: ${error?.message ?? error}`;
    publish("safari-runtime-changed");
  } finally {
    resolving = false;
  }
});
