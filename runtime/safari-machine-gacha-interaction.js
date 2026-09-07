import { resolveSafariMachineGachaInteraction as resolveCanonicalMachineGacha } from "./safari-playable-integration-pre-wounded.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function eventOf(runtime, index) {
  const event = stateOf(runtime).board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "machine_gacha") {
    throw new Error("machine_gacha board event is required");
  }
  return event;
}

export function safariMachineGachaMessage(runtime, index) {
  const event = eventOf(runtime, index);
  const data = event.normal_data ?? {};
  const stock = Array.isArray(data.machine_stock) ? data.machine_stock : [];
  const cursor = Math.max(0, Math.trunc(Number(data.machine_index ?? 0)));
  const remaining = Math.max(0, stock.length - cursor);
  return remaining > 0
    ? `技術端末にはあと${remaining}件の出力候補があります。`
    : "技術端末の出力候補は残っていません。";
}

export function safariMachineGachaActions(runtime, index) {
  const event = eventOf(runtime, index);
  const data = event.normal_data ?? {};
  const stock = Array.isArray(data.machine_stock) ? data.machine_stock : [];
  const cursor = Math.max(0, Math.trunc(Number(data.machine_index ?? 0)));
  const remaining = Math.max(0, stock.length - cursor);
  return [
    { id:"buy", label:"1500円を投入する", meta:"技マシンを1つ出力", disabled:remaining <= 0 },
    { id:"leave", label:"立ち去る", secondary:true },
  ];
}

export function resolveSafariMachineGachaInteraction(runtime, index, actionId) {
  const result = resolveCanonicalMachineGacha(runtime, index, [String(actionId ?? "leave")]);
  const completed = Boolean(stateOf(runtime).board_consumed?.[index]);
  return {
    ...result,
    completed,
    persistenceRequested:true,
  };
}
