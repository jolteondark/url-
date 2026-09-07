import { safariLostBagWarning } from "./safari-lost-bag-interaction.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function signalNormalEventUi() {
  if (typeof globalThis.dispatchEvent === "function" && typeof globalThis.CustomEvent === "function") {
    globalThis.dispatchEvent(new CustomEvent("safari-normal-event-ui"));
  }
}

export function openSafariLostBagTouch(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "lost_bag") {
    throw new Error("lost_bag board event is required");
  }
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", operations:[] };
  if (state.shop) return { runtime, result:"shop_active", operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const warned = safariLostBagWarning(runtime, index);
  const title = "落とし物";
  const message = warned
    ? "道にバッグが落ちています。あく/エスパータイプの仲間が罠の気配に気づいています。"
    : "道にバッグが落ちています。開けるか、持ち主を待つか選べます。";
  const actions = [
    { id:"open", label:"バッグを開ける", meta:warned ? "罠の可能性あり" : "中身を確認する" },
    { id:"wait", label:"持ち主を待つ", meta:warned ? "待ち伏せの可能性あり" : "持ち主が戻るか待つ" },
    { id:"leave", label:"触れずに立ち去る", secondary:true },
  ];
  state.notice = message;
  globalThis.__maplessNormalEventUi = { runtime, boardIndex:index, eventId:"lost_bag", title, message, actions };
  signalNormalEventUi();
  return {
    runtime,
    result:"lost_bag_ready",
    boundary:"normal_event",
    notice:state.notice,
    operations:[],
    warned,
  };
}
