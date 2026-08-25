import {
  resolveSafariWishingFountainInteraction,
  safariWishingFountainBonusCandidates,
  safariWishingFountainPresentation,
} from "./runtime/safari-wishing-fountain-final-routes.js?v=20260826-0245";
import { saveSafariPlayableRun } from "./runtime/safari-web-startup.js";

let resolving = false;
function runtime() { return globalThis.__maplessSafariRuntime ?? null; }
function state() { return runtime()?.variables?.mapless ?? null; }
function fountainAt(index) {
  const event = state()?.board_events?.[index];
  return event?.kind === "normal_event" && event?.normal_event_id === "wishing_fountain" ? event : null;
}
function activeUi() {
  const active = globalThis.__maplessNormalEventUi ?? null;
  return active?.runtime === runtime() && active?.eventId === "wishing_fountain" ? active : null;
}
function publish(name) {
  if (typeof globalThis.CustomEvent !== "function") return;
  globalThis.window?.dispatchEvent?.(new CustomEvent(name));
}
function setUi(index) {
  const current = runtime();
  const currentState = state();
  if (!current || !currentState || !fountainAt(index)) return false;
  const presentation = safariWishingFountainPresentation(current, index);
  currentState.notice = presentation.message;
  globalThis.__maplessNormalEventUi = {
    runtime:current,
    boardIndex:index,
    eventId:"wishing_fountain",
    title:presentation.title,
    message:presentation.message,
    actions:presentation.actions,
  };
  publish("safari-normal-event-ui");
  publish("safari-runtime-changed");
  return true;
}

function openFountain(index) {
  const currentState = state();
  if (!currentState || !fountainAt(index)) return false;
  if (currentState.location !== "day_board" || currentState.battle || currentState.shop || currentState.board_consumed?.[index]) return false;
  currentState.board_revealed[index] = true;
  currentState.board_visited[index] = true;
  return setUi(index);
}

function bonusSelectionOptions(current, index, action) {
  if (action !== "large_wish") return {};
  const event = fountainAt(index);
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

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-board-index]");
  if (!button || button.disabled) return;
  const index = Number(button.dataset.boardIndex);
  if (!Number.isInteger(index) || !fountainAt(index)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  try { openFountain(index); }
  catch (error) {
    globalThis.__maplessLastError = error;
    const currentState = state();
    if (currentState) currentState.notice = `イベントエラー: ${error?.message ?? error}`;
    publish("safari-runtime-changed");
  }
}, { capture:true });

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
    if (result.persistenceRequested || result.operations?.some((operation) => operation.op === "request_save")) {
      saveSafariPlayableRun(window.localStorage, current);
    }
    if (result.completed || result.result === "normal_event_wild_battle_started") globalThis.__maplessNormalEventUi = null;
    else setUi(active.boardIndex);
    publish("safari-runtime-changed");
    if (!result.completed && result.result !== "normal_event_wild_battle_started") publish("safari-normal-event-ui");
  } catch (error) {
    globalThis.__maplessLastError = error;
    const currentState = state();
    if (currentState) currentState.notice = `イベントエラー: ${error?.message ?? error}`;
    publish("safari-runtime-changed");
  } finally {
    resolving = false;
  }
}, { capture:true });
