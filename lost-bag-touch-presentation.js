import "./old-statue-touch-presentation.js?v=20260826-1500";
import "./wishing-fountain-touch-presentation.js?v=20260826-0245";
import "./item-collector-touch-presentation.js?v=20260825-2355";
import "./trainer-camp-touch-presentation.js?v=20260825-2330";
import "./berry-juice-shop-touch-presentation.js?v=20260825-2300";
import { safariLostBagWarning } from "./runtime/safari-lost-bag-interaction.js";

function runtime() { return globalThis.__maplessSafariRuntime ?? null; }
function state() { return runtime()?.variables?.mapless ?? null; }
function lostBagAt(index) {
  const event = state()?.board_events?.[index];
  return event?.kind === "normal_event" && event?.normal_event_id === "lost_bag" ? event : null;
}
function publish(name) {
  if (typeof globalThis.CustomEvent !== "function") return;
  globalThis.window?.dispatchEvent?.(new CustomEvent(name));
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
    actions:[
      { id:"open", label:"袋を開ける", meta:"道具が入っているか、罠かもしれません" },
      { id:"wait", label:"持ち主を待つ", meta:"持ち主が戻ればお礼。罠なら危険な勝負" },
      { id:"leave", label:"触れずに立ち去る", secondary:true },
    ],
  };
  publish("safari-normal-event-ui");
  publish("safari-runtime-changed");
  return true;
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-board-index]");
  if (!button || button.disabled) return;
  const index = Number(button.dataset.boardIndex);
  if (!Number.isInteger(index) || !lostBagAt(index)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  openLostBag(index);
}, { capture:true });
