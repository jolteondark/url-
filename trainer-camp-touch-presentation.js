import {
  resolveSafariTrainerCampInteraction,
  safariTrainerCampPresentation,
} from "./runtime/safari-trainer-camp-interaction.js?v=20260825-2330";
import { saveSafariPlayableRun } from "./runtime/safari-web-startup.js";

let resolving = false;
function runtime() { return globalThis.__maplessSafariRuntime ?? null; }
function state() { return runtime()?.variables?.mapless ?? null; }
function campAt(index) {
  const event = state()?.board_events?.[index];
  return event?.kind === "normal_event" && event?.normal_event_id === "trainer_camp" ? event : null;
}
function activeCampUi() {
  const active = globalThis.__maplessNormalEventUi ?? null;
  return active?.runtime === runtime() && active?.eventId === "trainer_camp" ? active : null;
}
function publish(name) {
  if (typeof globalThis.CustomEvent !== "function") return;
  globalThis.window?.dispatchEvent?.(new CustomEvent(name));
}
async function refreshActive() {
  const current = runtime();
  const active = activeCampUi();
  if (!current || !active || !campAt(active.boardIndex)) return;
  const presentation = await safariTrainerCampPresentation(current, active.boardIndex);
  active.title = presentation.title;
  active.message = presentation.message;
  active.actions = presentation.actions;
}
async function openTrainerCamp(index) {
  const current = runtime();
  const currentState = state();
  const event = campAt(index);
  if (!current || !currentState || !event) return false;
  if (currentState.location !== "day_board" || currentState.battle || currentState.shop || currentState.board_consumed?.[index]) return false;
  currentState.board_revealed[index] = true;
  currentState.board_visited[index] = true;
  const presentation = await safariTrainerCampPresentation(current, index);
  currentState.notice = presentation.message;
  globalThis.__maplessNormalEventUi = {
    runtime:current,
    boardIndex:index,
    eventId:"trainer_camp",
    title:presentation.title,
    message:presentation.message,
    actions:presentation.actions,
  };
  publish("safari-normal-event-ui");
  publish("safari-runtime-changed");
  return true;
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-board-index]");
  if (!button || button.disabled) return;
  const index = Number(button.dataset.boardIndex);
  if (!Number.isInteger(index) || !campAt(index)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  try {
    await openTrainerCamp(index);
  } catch (error) {
    globalThis.__maplessLastError = error;
    const currentState = state();
    if (currentState) currentState.notice = `イベントエラー: ${error?.message ?? error}`;
    publish("safari-runtime-changed");
  }
}, { capture:true });

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-normal-event-action]");
  const active = activeCampUi();
  const current = runtime();
  if (!button || !active || !current || resolving) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  resolving = true;
  button.disabled = true;
  try {
    const result = await resolveSafariTrainerCampInteraction(current, active.boardIndex, button.dataset.normalEventAction);
    if (result.persistenceRequested || result.operations?.some((operation) => operation.op === "request_save")) {
      saveSafariPlayableRun(window.localStorage, current);
    }
    if (result.completed) globalThis.__maplessNormalEventUi = null;
    else await refreshActive();
    publish("safari-runtime-changed");
    if (!result.completed) publish("safari-normal-event-ui");
  } catch (error) {
    globalThis.__maplessLastError = error;
    const currentState = state();
    if (currentState) currentState.notice = `イベントエラー: ${error?.message ?? error}`;
    publish("safari-runtime-changed");
  } finally {
    resolving = false;
  }
}, { capture:true });

window.addEventListener("safari-runtime-changed", () => {
  refreshActive().catch((error) => {
    globalThis.__maplessLastError = error;
  });
}, { passive:true });
