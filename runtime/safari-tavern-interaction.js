import * as legacy from "./safari-tavern-interaction-legacy.js";
import { healSafariPartyPercent } from "./safari-pokemon-healing.js";
import { commitSafariBagEconomyReceipt } from "./safari-bag-economy-receipt.js";

export * from "./safari-tavern-interaction-legacy.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function restChanged(before, after) {
  return before.some((entry, index) => {
    const next = after[index];
    return entry && next && (Number(entry.hp ?? 0) !== Number(next.hp ?? 0)
      || String(entry.status ?? "NONE") !== String(next.status ?? "NONE"));
  });
}

function refreshRestUi(runtime, index, notice) {
  if (typeof globalThis.document === "undefined") return;
  const ui = globalThis.__maplessNormalEventUi;
  if (!ui || ui.runtime !== runtime || Number(ui.boardIndex) !== Number(index) || ui.eventId !== "tavern") return;
  ui.message = notice;
  ui.actions = (ui.actions ?? []).map((action) => action?.id === "rest"
    ? { ...action, meta:"本日は利用済み", disabled:true }
    : action);
}

export function resolveSafariTavernAction(runtime, index, action, options = {}) {
  if (action !== "rest") return legacy.resolveSafariTavernAction(runtime, index, action, options);

  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "tavern") throw new Error("tavern board event is required");
  state.board_revealed[index] = true;
  state.board_visited[index] = true;

  if (event.tavern_rest_used) {
    state.notice = "この酒場では、今日はもう休めません。";
    refreshRestUi(runtime, index, state.notice);
    return { runtime, result:"already_rested", completed:false, consumed:false, operations:[] };
  }
  if (Number(runtime.bag?.money ?? 0) < legacy.MAPLESS_TAVERN_REST_COST_V108) {
    state.notice = "休憩には600円必要です。";
    refreshRestUi(runtime, index, state.notice);
    return { runtime, result:"insufficient_money", completed:false, consumed:false, operations:[] };
  }

  const receipt = commitSafariBagEconomyReceipt(runtime, { moneyDelta:-legacy.MAPLESS_TAVERN_REST_COST_V108 });
  if (!receipt.success) {
    state.notice = "休憩には600円必要です。";
    refreshRestUi(runtime, index, state.notice);
    return { runtime, result:receipt.result ?? "insufficient_money", completed:false, consumed:false, operations:receipt.operations ?? [] };
  }

  const before = (runtime.player?.party ?? []).map((pokemon) => pokemon ? { hp:pokemon.hp, status:pokemon.status } : null);
  healSafariPartyPercent(runtime, 50, { cureStatus:true });
  const healed = restChanged(before, runtime.player?.party ?? []);
  event.tavern_rest_used = true;
  state.notice = "静かな席で身体を休め、手持ちのHPを回復し、状態異常を治しました。";
  const operations = [
    ...receipt.operations,
    { op:"tavern_rest", cost:legacy.MAPLESS_TAVERN_REST_COST_V108, healed },
    { op:"request_save", reason:"tavern_rest" },
  ];
  state.last_operations = operations;
  refreshRestUi(runtime, index, state.notice);
  return { runtime, result:"rested", completed:false, consumed:false, healed, persistenceRequested:true, operations };
}