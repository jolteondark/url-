import { resolvePhotographer } from "./mapless-normal-events-a3-flow.js";
import { registerSafariNormalEventBattleContinuation } from "./safari-normal-event-battle-continuation.js";
import { safariPokemonTypes } from "./safari-pokemon-type-membership.js";
import {
  applySafariSmallItemReward,
  preflightSafariSharedSmallItemReward,
} from "./safari-small-item-reward.js";
import {
  borrowSafariSharedRunRandomInt,
  ensureSafariEncounterSeed,
} from "./safari-encounter-randomization.js";
import { activateSafariNormalEventWildBattle } from "./safari-web-combat-start.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function scalingValue(day) { return Math.max(Math.floor((Math.max(1, Number(day) || 1) - 1) / 5), 0); }
function usable(pokemon) { return Boolean(pokemon) && Number(pokemon.hp ?? 0) > 0 && pokemon.egg !== true; }
function requestedType(event) { return String(event?.normal_data?.requested_type ?? "").trim().toUpperCase(); }
function matchesRequestedType(pokemon, type) { return usable(pokemon) && safariPokemonTypes(pokemon).includes(type); }
function pokemonSpecial(pokemon) {
  // v0.9.108 exposes Photographer's special reward as an injected boolean. Safari
  // only maps the canonical Pokemon Runtime rarity flag that is unambiguous here;
  // do not invent additional Delta/species heuristics in the event adapter.
  return pokemon?.shiny === true || pokemon?.super_shiny === true;
}
function pokemonLabel(pokemon) {
  const name = String(pokemon?.nickname || pokemon?.species || "ポケモン");
  const level = Number(pokemon?.level);
  return Number.isFinite(level) ? `${name} Lv.${level}` : name;
}
function addMoney(runtime, amount) {
  runtime.bag ??= { slots:[], money:0 };
  const value = Math.max(0, Math.trunc(Number(amount) || 0));
  runtime.bag.money = Math.max(0, Math.trunc(Number(runtime.bag.money ?? 0))) + value;
  return { op:"runtime_add_money", amount:value };
}
function sharedSmallReward(runtime) {
  const state = stateOf(runtime);
  ensureSafariEncounterSeed(state);
  const counter = state.preview_encounter_counter;
  const reward = preflightSafariSharedSmallItemReward(
    runtime,
    (limit) => borrowSafariSharedRunRandomInt(runtime, limit),
    1,
  );
  if (!reward.success) state.preview_encounter_counter = counter;
  return { reward, counter };
}
function rollbackSharedSmallReward(runtime, counter) {
  if (Number.isInteger(counter) && counter >= 0) stateOf(runtime).preview_encounter_counter = counter;
}
function battleOperation(owner) { return (owner.operations ?? []).find((operation) => operation?.op === "start_wild_battle") ?? null; }
function battleSucceeded(summary = {}) { const decision = Number(summary.decision); return decision === 1 || decision === 4; }

export function safariPhotographerPartyChoices(runtime, event) {
  const type = requestedType(event);
  return (runtime.player?.party ?? [])
    .map((pokemon, index) => ({ pokemon, index }))
    .filter(({ pokemon }) => matchesRequestedType(pokemon, type))
    .map(({ pokemon, index }) => ({
      id:`party:${index}`,
      label:`${pokemonLabel(pokemon)}を撮ってもらう`,
      meta:pokemonSpecial(pokemon) ? "色違い · 特別報酬" : `${type}タイプ`,
    }));
}

registerSafariNormalEventBattleContinuation("photographer", (runtime, continuation) => {
  if (continuation.actionId !== "wild") throw new Error(`unsupported photographer Battle continuation action: ${continuation.actionId}`);
  const state = stateOf(runtime);
  const index = Number(continuation.boardIndex);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "photographer") throw new Error("photographer continuation requires the originating board event");

  const success = battleSucceeded(continuation.battleReturn);
  if (!success) {
    const owner = resolvePhotographer({ event, action:"wild", scaling_value:scalingValue(state.day), battle_success:false });
    state.board_events[index] = owner.event;
    state.board_consumed[index] = Boolean(owner.event.normal_resolved);
    state.last_operations = [
      ...(owner.operations ?? []).filter((operation) => operation?.op !== "start_wild_battle").map((operation) => structuredClone(operation)),
      { op:"request_save", reason:"normal_event_post_battle" },
    ];
    state.notice = "撮影対象の野生ポケモンから離れました。";
    return { runtime, result:owner.outcome, completed:true, terminal:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  const projected = sharedSmallReward(runtime);
  const reward = projected.reward;
  if (!reward.success) {
    rollbackSharedSmallReward(runtime, projected.counter);
    state.notice = "撮影成功のお礼を受け取る空きがありません。バッグを空けてから受け取ってください。";
    return { runtime, result:"reward_bag_full", completed:false, terminal:false, operations:reward.operations.map((operation) => structuredClone(operation)), notice:state.notice, persistenceRequested:false };
  }

  const scale = scalingValue(state.day);
  const owner = resolvePhotographer({ event, action:"wild", scaling_value:scale, battle_success:true });
  const money = 1200 + scale * 200;
  const applied = applySafariSmallItemReward(runtime, reward);
  const moneyOp = addMoney(runtime, money);
  state.board_events[index] = owner.event;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? []).filter((operation) => operation?.op !== "start_wild_battle").map((operation) => structuredClone(operation)),
    ...(reward.operations ?? []).map((operation) => structuredClone(operation)),
    ...applied,
    moneyOp,
    { op:"request_save", reason:"normal_event_post_battle" },
  ];
  state.notice = `撮影に成功し、${money}円と${reward.selectedItems?.[0] ?? "道具"}を受け取りました。`;
  return { runtime, result:owner.outcome, completed:true, terminal:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
});

export function resolveSafariPhotographerInteraction(runtime, index, requestedAction) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "photographer") throw new Error("photographer board event is required");
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", operations:[] };
  if (state.shop) return { runtime, result:"shop_active", operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const choices = safariPhotographerPartyChoices(runtime, event);
  const availableActions = [...choices.map((entry) => entry.id), "wild", "leave"];
  const raw = String(requestedAction ?? "");
  if (!availableActions.includes(raw)) return { runtime, result:"unsupported_action", completed:false, operations:[], availableActions };
  const scale = scalingValue(state.day);

  if (raw === "wild") {
    const preview = resolvePhotographer({ event, action:"wild", scaling_value:scale, battle_success:false });
    const battleEvent = battleOperation(preview);
    if (!battleEvent) throw new Error("photographer wild route requires canonical Battle request");
    return activateSafariNormalEventWildBattle(runtime, index, {
      eventId:"photographer",
      actionId:"wild",
      battleEvent,
      request:structuredClone(battleEvent),
      payload:{ requested_type:requestedType(event) },
    });
  }

  if (raw.startsWith("party:")) {
    const partyIndex = Number(raw.slice(6));
    const pokemon = runtime.player?.party?.[partyIndex];
    if (!Number.isInteger(partyIndex) || !matchesRequestedType(pokemon, requestedType(event))) return { runtime, result:"pokemon_unavailable", completed:false, operations:[], availableActions };
    const special = pokemonSpecial(pokemon);
    const owner = resolvePhotographer({
      event,
      action:"party",
      has_requested_type:true,
      chosen_pokemon:pokemon,
      pokemon_special:special,
      scaling_value:scale,
    });
    const money = (special ? 1200 : 600) + scale * 100;
    const moneyOp = addMoney(runtime, money);
    state.board_events[index] = owner.event;
    state.board_consumed[index] = Boolean(owner.event.normal_resolved);
    state.last_operations = [...(owner.operations ?? []).map((operation) => structuredClone(operation)), moneyOp];
    state.notice = special ? `色違いのポケモンを撮ってもらい、${money}円受け取りました。` : `ポケモンを撮ってもらい、${money}円受け取りました。`;
    return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  const owner = resolvePhotographer({ event, action:"leave", scaling_value:scale });
  state.board_events[index] = owner.event;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = (owner.operations ?? []).map((operation) => structuredClone(operation));
  state.notice = "撮影を断って立ち去りました。";
  return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
}
