import { resolveCanonicalNormalEvent } from "./mapless-canonical-normal-event-dispatcher.js";
import { persistSafariOwnerResult } from "./safari-owner-result-persistence.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function eventAt(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "bounty_poster") throw new Error("bounty_poster board event is required");
  return event;
}

function commitOwnerResult(runtime, index, owner) {
  const state = stateOf(runtime);
  const setBounty = (owner.operations ?? []).find((operation) => operation?.op === "set_bounty");
  if (setBounty) state.mapless_bounty = structuredClone(setBounty.value);
  state.board_events[index] = owner.event;
  state.board_visited[index] = true;
  state.board_consumed[index] = Boolean(owner.event?.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? []).map((operation) => structuredClone(operation)),
    { op:"request_save", reason:"normal_event_bounty_poster" },
  ];
  return state;
}

export function bountyPosterUi(runtime, index) {
  const event = eventAt(runtime, index);
  const data = event.normal_data ?? {};
  return {
    title:"賞金首の手配書",
    message:`手配書には「${String(data.appearance ?? "特徴不明")}」とあります。対象は${String(data.type ?? "不明")}タイプ、報酬は${Math.max(0, Math.trunc(Number(data.reward) || 0)).toLocaleString("ja-JP")}円です。`,
    actions:[
      { id:"accept", label:"依頼を受ける", meta:"翌日以降に賞金首が出現" },
      { id:"decline", label:"断る", secondary:true },
    ],
  };
}

export function openSafariBountyPosterTouch(runtime, index) {
  const state = stateOf(runtime);
  eventAt(runtime, index);
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", operations:[] };
  if (state.shop) return { runtime, result:"shop_active", operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const ui = bountyPosterUi(runtime, index);
  state.notice = ui.message;
  if (typeof globalThis.document !== "undefined") {
    globalThis.__maplessNormalEventUi = { runtime, boardIndex:index, eventId:"bounty_poster", ...ui };
    if (typeof globalThis.CustomEvent === "function") globalThis.window?.dispatchEvent?.(new globalThis.CustomEvent("safari-normal-event-ui"));
  }
  return { runtime, result:"bounty_poster_ready", boundary:"normal_event", eventId:"bounty_poster", normalEventUi:ui, availableActions:ui.actions.map((action) => action.id), notice:state.notice, operations:[] };
}

export function resolveSafariBountyPosterInteraction(runtime, index, requestedAction) {
  const state = stateOf(runtime);
  const event = eventAt(runtime, index);
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", completed:true, operations:[], persistenceRequested:false };
  const action = String(requestedAction ?? "");
  const owner = resolveCanonicalNormalEvent("bounty_poster", {
    event,
    action,
    current_day:Math.max(1, Math.trunc(Number(state.day) || 1)),
    existing_bounty:Boolean(state.mapless_bounty),
  });
  if (!owner.result) return { runtime, result:owner.outcome, completed:false, operations:owner.operations ?? [], persistenceRequested:false, owner };
  commitOwnerResult(runtime, index, owner);
  if (owner.outcome === "accepted") state.notice = "依頼を受けました。翌日以降、賞金首の居場所が開示されます。";
  else if (owner.outcome === "already_active") state.notice = "すでに別の賞金首を追っています。";
  else state.notice = "依頼を断り、手配書から離れました。";
  return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
}

// Reuse the shared normal-event card without teaching its presentation layer bounty mechanics.
// The canonical owner above remains the sole authority for accept/decline and state mutation.
if (typeof globalThis.document !== "undefined") {
  globalThis.document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("button[data-normal-event-action]");
    const active = globalThis.__maplessNormalEventUi ?? null;
    if (!button || active?.eventId !== "bounty_poster") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const runtime = active.runtime ?? globalThis.__maplessSafariRuntime;
    if (!runtime) return;
    try {
      const result = resolveSafariBountyPosterInteraction(runtime, Number(active.boardIndex), button.dataset.normalEventAction);
      persistSafariOwnerResult(runtime, result, globalThis.window?.localStorage);
      if (result.completed) globalThis.__maplessNormalEventUi = null;
      globalThis.window?.dispatchEvent?.(new globalThis.CustomEvent("safari-runtime-changed"));
    } catch (error) {
      globalThis.__maplessLastError = error;
      stateOf(runtime).notice = `イベントエラー: ${error?.message ?? error}`;
      globalThis.window?.dispatchEvent?.(new globalThis.CustomEvent("safari-runtime-changed"));
    }
  }, true);
}
