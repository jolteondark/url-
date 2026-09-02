import { resolveBerryContest } from "./mapless-berry-contest-flow.js";
import { safariBerryContestBerryChoices } from "./safari-berry-contest-interaction.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

export function openSafariBerryContestTouch(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "berry_contest") throw new Error("berry_contest board event is required");
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", operations:[] };
  if (state.shop) return { runtime, result:"shop_active", operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };

  const intent = resolveBerryContest({ event, action:null });
  const canonicalActions = (intent.operations ?? []).find((operation) => operation?.op === "present_choices")?.actions ?? [];
  const berries = safariBerryContestBerryChoices(runtime);
  const generalCount = berries.filter((entry) => entry.grade === 0).reduce((sum, entry) => sum + entry.qty, 0);
  const actions = [];
  if (canonicalActions.includes("single")) {
    actions.push(...berries.map((entry) => ({ id:`single:${entry.id}`, label:`${entry.id}を1個出品`, meta:`所持${entry.qty}個 · 品質${entry.grade}` })));
    if (berries.length === 0) actions.push({ id:"no_berry", label:"出品できるきのみがありません", disabled:true });
  }
  if (canonicalActions.includes("bulk")) actions.push({ id:"bulk", label:"一般きのみを3個出品", meta:`対象${generalCount}個 · 詰め合わせ審査`, disabled:generalCount < 3 });
  if (canonicalActions.includes("watch")) actions.push({ id:"watch", label:"見物する", meta:"見物客向けのきのみ1個" });
  if (canonicalActions.includes("leave")) actions.push({ id:"leave", label:"立ち去る", secondary:true });

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  state.notice = "旅人たちがきのみ品評会を開いています。出品するか、見物するか選べます。";
  const ui = { title:"きのみ品評会", message:state.notice, actions };
  if (typeof globalThis.document !== "undefined") {
    globalThis.__maplessNormalEventUi = { runtime, boardIndex:index, eventId:"berry_contest", ...ui };
    if (typeof globalThis.CustomEvent === "function") globalThis.window?.dispatchEvent?.(new globalThis.CustomEvent("safari-normal-event-ui"));
  }
  return {
    runtime,
    result:"berry_contest_ready",
    boundary:"normal_event",
    eventId:"berry_contest",
    normalEventUi:ui,
    availableActions:actions.filter((action) => action.disabled !== true).map((action) => action.id),
    notice:state.notice,
    operations:intent.operations ?? [],
  };
}
