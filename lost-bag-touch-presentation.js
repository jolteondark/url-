import {
  resolveSafariLostBagInteraction,
  safariLostBagWarning,
} from "./runtime/safari-lost-bag-interaction.js";

let resolving = false;
let startupModulePromise = null;
const startupModule = () => startupModulePromise ??= import("./runtime/safari-web-startup.js");

function runtime() { return globalThis.__maplessSafariRuntime ?? null; }
function state() { return runtime()?.variables?.mapless ?? null; }
function activeLostBag() {
  const active = globalThis.__maplessNormalEventUi ?? null;
  return active?.runtime === runtime() && active?.eventId === "lost_bag" ? active : null;
}
function lostBagAt(index) {
  const currentState = state();
  const event = currentState?.board_events?.[index];
  return event?.kind === "normal_event" && event?.normal_event_id === "lost_bag" ? event : null;
}
function publish(name) {
  if (typeof globalThis.CustomEvent !== "function") return;
  globalThis.window?.dispatchEvent?.(new CustomEvent(name));
}
function actions() {
  return [
    { id:"open", label:"袋を開ける", meta:"道具が入っているか、罠かもしれません" },
    { id:"wait", label:"持ち主を待つ", meta:"持ち主が戻ればお礼。罠なら危険な勝負" },
    { id:"leave", label:"触れずに立ち去る", secondary:true },
  ];
}
function openLostBag(index) {
  const current = runtime();
  const currentState = state();
  const event = lostBagAt(index);
  if (!current || !currentState || !event) return false;
  if (currentState.location !== "day_board" || currentState.battle || currentState.shop || currentState.board_consumed?.[index]) return false;
  currentState.board_revealed[index] = true;
  currentState.board_visited[index] = true;
  const warned = safariLostBagWarning(current, index);
  const message = warned
    ? "落とし物の袋があります。あく/エスパータイプのポケモンが罠の気配を感じています。"
    : "落とし物の袋があります。開けるか、持ち主を待つか選べます。";
  currentState.notice = message;
  globalThis.__maplessNormalEventUi = {
    runtime:current,
    boardIndex:index,
    eventId:"lost_bag",
    title:"落とし物",
    message,
    actions:actions(),
  };
  publish("safari-normal-event-ui");
  publish("safari-runtime-changed");
  return true;
}

document.addEventListener("click", async (event) => {
  const actionButton = event.target.closest("button[data-normal-event-action]");
  const active = activeLostBag();
  if (actionButton && active) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (resolving) return;
    const current = runtime();
    if (!current) return;
    resolving = true;
    actionButton.disabled = true;
    try {
      const result = await resolveSafariLostBagInteraction(current, active.boardIndex, actionButton.dataset.normalEventAction);
      if (result.persistenceRequested || result.operations?.some((operation) => operation.op === "request_save")) {
        const { saveSafariPlayableRun } = await startupModule();
        saveSafariPlayableRun(window.localStorage, current);
      }
      if (result.completed) globalThis.__maplessNormalEventUi = null;
      publish("safari-runtime-changed");
      publish("safari-normal-event-ui");
    } catch (error) {
      globalThis.__maplessLastError = error;
      const currentState = state();
      if (currentState) currentState.notice = `落とし物イベントエラー: ${error?.message ?? error}`;
      publish("safari-runtime-changed");
      publish("safari-normal-event-ui");
    } finally {
      resolving = false;
    }
    return;
  }

  const boardButton = event.target.closest("button[data-board-index]");
  if (!boardButton || boardButton.disabled) return;
  const index = Number(boardButton.dataset.boardIndex);
  if (!Number.isInteger(index) || !lostBagAt(index)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  openLostBag(index);
}, { capture:true });
