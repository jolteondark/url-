import { resolveSafariMachineGachaInteraction } from "./runtime/safari-playable-integration-pre-wounded.js";

let resolving = false;

function runtime() { return globalThis.__maplessSafariRuntime ?? null; }
function state() { return runtime()?.variables?.mapless ?? null; }
function machineAt(index) {
  const event = state()?.board_events?.[index];
  return event?.kind === "normal_event" && event?.normal_event_id === "machine_gacha" ? event : null;
}
function activeUi() {
  const active = globalThis.__maplessNormalEventUi ?? null;
  return active?.runtime === runtime() && active?.eventId === "machine_gacha" ? active : null;
}
function publish(name) {
  if (typeof globalThis.CustomEvent !== "function") return;
  globalThis.window?.dispatchEvent?.(new CustomEvent(name));
}
function presentation(index) {
  const currentState = state();
  const event = machineAt(index);
  const data = event?.normal_data ?? {};
  const stock = Array.isArray(data.machine_stock) ? data.machine_stock : [];
  const cursor = Math.max(0, Math.trunc(Number(data.machine_index ?? 0)));
  const remaining = Math.max(0, stock.length - cursor);
  return {
    title:"壊れかけの技術端末",
    message:remaining > 0
      ? `技術端末にはあと${remaining}件の出力候補があります。`
      : "技術端末の出力候補は残っていません。",
    actions:[
      { id:"buy", label:"1500円を投入する", meta:"技マシンを1つ出力", disabled:remaining <= 0 },
      { id:"leave", label:"立ち去る", secondary:true },
    ],
  };
}
function setUi(index) {
  const current = runtime();
  const currentState = state();
  if (!current || !currentState || !machineAt(index)) return false;
  const ui = presentation(index);
  currentState.notice = ui.message;
  globalThis.__maplessNormalEventUi = {
    runtime:current,
    boardIndex:index,
    eventId:"machine_gacha",
    ...ui,
  };
  publish("safari-normal-event-ui");
  publish("safari-runtime-changed");
  return true;
}
function openMachine(index) {
  const currentState = state();
  if (!currentState || !machineAt(index)) return false;
  if (currentState.location !== "day_board" || currentState.battle || currentState.shop || currentState.board_consumed?.[index]) return false;
  currentState.board_revealed[index] = true;
  currentState.board_visited[index] = true;
  return setUi(index);
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-board-index]");
  if (!button || button.disabled) return;
  const index = Number(button.dataset.boardIndex);
  if (!Number.isInteger(index) || !machineAt(index)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  try { openMachine(index); }
  catch (error) {
    globalThis.__maplessLastError = error;
    const currentState = state();
    if (currentState) currentState.notice = `イベントエラー: ${error?.message ?? error}`;
    publish("safari-runtime-changed");
  }
}, { capture:true });

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-normal-event-action]");
  const active = activeUi();
  const current = runtime();
  if (!button || !active || !current || resolving) return;
  const action = String(button.dataset.normalEventAction ?? "");
  if (action !== "buy" && action !== "leave") return;
  event.preventDefault();
  event.stopImmediatePropagation();
  resolving = true;
  button.disabled = true;
  try {
    const result = resolveSafariMachineGachaInteraction(current, active.boardIndex, [action]);
    const completed = Boolean(state()?.board_consumed?.[active.boardIndex]);
    if (completed) globalThis.__maplessNormalEventUi = null;
    else setUi(active.boardIndex);
    publish("safari-runtime-changed");
    if (!completed) publish("safari-normal-event-ui");
    globalThis.__maplessLastMachineGachaResult = { ...result, completed };
  } catch (error) {
    globalThis.__maplessLastError = error;
    const currentState = state();
    if (currentState) currentState.notice = `イベントエラー: ${error?.message ?? error}`;
    publish("safari-runtime-changed");
  } finally {
    resolving = false;
  }
}, { capture:true });
