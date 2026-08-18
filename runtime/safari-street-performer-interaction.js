import { resolveStreetPerformer } from "./mapless-normal-events-a4-flow.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function scalingValue(day) {
  return Math.max(Math.floor((Math.max(1, Number(day) || 1) - 1) / 5), 0);
}

function healPartyTenPercent(runtime) {
  runtime.player ??= { party: [] };
  runtime.player.party = (runtime.player.party ?? []).map((pokemon) => {
    if (!pokemon || Number(pokemon.hp ?? 0) <= 0) return pokemon;
    const maxHp = Math.max(1, Math.trunc(Number(pokemon.max_hp ?? pokemon.hp ?? 1)));
    const amount = Math.max(1, Math.ceil(maxHp * 0.10));
    return updatePokemonRuntime(pokemon, { hp: Math.min(maxHp, Math.trunc(Number(pokemon.hp ?? 0)) + amount) });
  });
}

function commitResolvedEvent(runtime, index, owner, appliedOperations) {
  const state = stateOf(runtime);
  state.board_events[index] = owner.event;
  state.board_visited[index] = true;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? []).map((operation) => structuredClone(operation)),
    ...appliedOperations,
  ];
  return state;
}

export function resolveSafariStreetPerformerInteraction(runtime, index, action) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "street_performer") {
    throw new Error("street_performer board event is required");
  }
  if (state.battle && !state.battle.completed) return { runtime, result: "battle_active", operations: [] };
  if (state.shop) return { runtime, result: "shop_active", operations: [] };
  if (state.board_consumed?.[index]) return { runtime, result: "already_consumed", operations: [] };

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const scale = scalingValue(state.day);
  const viewingPrice = 300 + scale * 30;
  const spendSuccess = action !== "watch" || Number(runtime.bag?.money ?? 0) >= viewingPrice;
  const owner = resolveStreetPerformer({
    event,
    action,
    current_day: Math.max(1, Math.trunc(Number(state.day) || 1)),
    scaling_value: scale,
    spend_success: spendSuccess,
  });
  const appliedOperations = [];

  if (action === "watch" && owner.result) {
    runtime.bag ??= { slots: [], money: 0 };
    runtime.bag.money = Math.max(0, Math.trunc(Number(runtime.bag.money ?? 0)) - viewingPrice);
    healPartyTenPercent(runtime);
    state.mapless_exp_show_battles = 1;
    appliedOperations.push(
      { op: "runtime_spend_money", amount: viewingPrice },
      { op: "runtime_heal_party_percent", amount: 10, revive: false },
      { op: "runtime_set_exp_show", battles: 1 },
    );
  }

  commitResolvedEvent(runtime, index, owner, appliedOperations);
  state.notice = owner.outcome === "watched_show"
    ? `大道芸を楽しみました。${viewingPrice}円を払い、手持ちが少し回復しました。`
    : owner.outcome === "insufficient_money"
      ? `大道芸を見るには${viewingPrice}円必要です。`
      : "大道芸人のもとを離れました。";
  return {
    runtime,
    result: owner.outcome,
    completed: Boolean(owner.result),
    viewingPrice,
    operations: state.last_operations,
    notice: state.notice,
    persistenceRequested: Boolean(owner.result),
    owner,
  };
}

export function interactiveSafariStreetPerformer(runtime, index) {
  const state = stateOf(runtime);
  const scale = scalingValue(state.day);
  const viewingPrice = 300 + scale * 30;
  const confirmFn = typeof globalThis.confirm === "function" ? globalThis.confirm.bind(globalThis) : null;
  if (!confirmFn) {
    state.board_revealed[index] = true;
    state.board_visited[index] = true;
    state.notice = `大道芸人がいます。芸を見るには${viewingPrice}円必要です。`;
    return { runtime, result: "street_performer_ready", boundary: "normal_event", notice: state.notice, operations: [] };
  }
  const watch = confirmFn(`大道芸人が即席の舞台を開いています。\n${viewingPrice}円を払って芸を見ますか？\n（キャンセルで立ち去る）`);
  return {
    ...resolveSafariStreetPerformerInteraction(runtime, index, watch ? "watch" : "leave"),
    boundary: "normal_event",
  };
}
