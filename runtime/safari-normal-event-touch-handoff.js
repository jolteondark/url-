import { maplessCarryMoneyGain } from "./mapless-carry-class-rules.js";

const SUPPORTED = new Set([
  "street_performer",
  "mushroom_field",
  "hot_spring",
  "fake_nurse",
  "traveling_cook",
  "flooded_river",
]);

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function scalingValue(day) {
  return Math.max(Math.floor((Math.max(1, Number(day) || 1) - 1) / 5), 0);
}

function definition(runtime, eventId) {
  const state = stateOf(runtime);
  const scale = scalingValue(state.day);
  if (eventId === "street_performer") {
    const price = 300 + scale * 30;
    return { title:"大道芸人", message:`大道芸人が即席の舞台を開いています。芸を見るには${price}円必要です。`, actions:[{id:"watch",label:"芸を見る",meta:`${price}円`},{id:"leave",label:"立ち去る",secondary:true}] };
  }
  if (eventId === "mushroom_field") {
    const nominal = 400 + scale * 120;
    const amount = maplessCarryMoneyGain(nominal, state.mapless_carry_class ?? "general");
    return { title:"怪しいキノコ畑", message:`採取したキノコは${amount}円で売れそうです。`, actions:[{id:"sell",label:"採取して売る",meta:`+${amount}円`},{id:"leave",label:"立ち去る",secondary:true}] };
  }
  if (eventId === "hot_spring") {
    return { title:"温泉", message:"岩の割れ目から温泉が湧いています。", actions:[{id:"enter",label:"温泉に入る",meta:"結果は入ってから"},{id:"leave",label:"立ち去る",secondary:true}] };
  }
  if (eventId === "fake_nurse") {
    const price = 500 + scale * 100;
    return { title:"簡易診療所", message:`看護師が${price}円で治療すると声をかけてきます。`, actions:[{id:"pay",label:"治療を受ける",meta:`${price}円`},{id:"leave",label:"警戒して立ち去る",secondary:true}] };
  }
  if (eventId === "traveling_cook") {
    const price = 600 + scale * 100;
    return { title:"旅の料理人", message:`${price}円で料理を作ってくれます。`, actions:[{id:"heal",label:"回復料理",meta:`HP50%回復 · ${price}円`},{id:"medicine",label:"薬膳料理",meta:`状態異常回復 · ${price}円`},{id:"leave",label:"立ち去る",secondary:true}] };
  }
  if (eventId === "flooded_river") {
    return { title:"増水した川", message:"濁流が進路を遮っています。", actions:[{id:"force",label:"強引に渡る",meta:"危険"},{id:"leave",label:"引き返す",secondary:true}] };
  }
  throw new RangeError(`unsupported normal-event touch id: ${eventId}`);
}

export function supportsSafariNormalEventTouch(eventId) {
  return SUPPORTED.has(String(eventId ?? ""));
}

export function openSafariNormalEventTouch(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  const eventId = String(event?.normal_event_id ?? "");
  if (!event || event.kind !== "normal_event" || !SUPPORTED.has(eventId)) throw new Error("supported normal_event board event is required");
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", operations:[] };
  if (state.shop) return { runtime, result:"shop_active", operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const ui = definition(runtime, eventId);
  state.notice = ui.message;
  if (typeof globalThis.document !== "undefined") {
    globalThis.__maplessNormalEventUi = { runtime, boardIndex:index, eventId, ...ui };
  }
  return {
    runtime,
    result:`${eventId}_ready`,
    boundary:"normal_event",
    eventId,
    normalEventUi:ui,
    availableActions:ui.actions.map((action) => action.id),
    notice:state.notice,
    operations:[],
  };
}
