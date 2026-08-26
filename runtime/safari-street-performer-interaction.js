import { resolveStreetPerformer } from "./mapless-normal-events-a4-flow.js";
import { ensureSafariGeneralData } from "./safari-general-data-demand.js";
import { grantSafariNormalEventPokemonExp } from "./safari-normal-event-exp-owner.js";
import { registerSafariNormalEventBattleContinuation } from "./safari-normal-event-battle-continuation.js";
import { safariPokemonTypes } from "./safari-pokemon-type-membership.js";
import { healSafariPartyPercent } from "./safari-pokemon-healing.js";
import { SAFARI_MOVE_MASTERS } from "./safari-playable-data.js";
import {
  applySafariSmallItemReward,
  preflightSafariSmallItemReward,
  safariDeterministicSmallRewardItem,
} from "./safari-small-item-reward.js";
import { activateSafariNormalEventTrainerBattle } from "./safari-web-combat-start.js";

const STREET_REWARD_SALT = 0x73747265;

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function scalingValue(day) { return Math.max(Math.floor((Math.max(1, Number(day) || 1) - 1) / 5), 0); }
function usablePokemon(pokemon) { return Boolean(pokemon) && pokemon.egg !== true && Number(pokemon.hp ?? 0) > 0; }
function pokemonLabel(pokemon) {
  const name = String(pokemon?.nickname || pokemon?.species || "ポケモン");
  const level = Number(pokemon?.level);
  return Number.isFinite(level) ? `${name} Lv.${level}` : name;
}
function moveId(move) { return String(typeof move === "string" ? move : move?.id ?? move?.move ?? "").trim().toUpperCase(); }
function sameTypeMove(pokemon, type) {
  const wanted = String(type ?? "").trim().toUpperCase();
  return (pokemon?.moves ?? []).some((move) => {
    const id = moveId(move);
    return id && String(SAFARI_MOVE_MASTERS[id]?.type ?? "").trim().toUpperCase() === wanted;
  });
}
function addMoney(runtime, amount) {
  const value = Math.max(0, Math.trunc(Number(amount) || 0));
  runtime.bag ??= { slots: [], money: 0 };
  runtime.bag.money = Math.max(0, Math.trunc(Number(runtime.bag.money ?? 0))) + value;
  return { op:"runtime_add_money", amount:value };
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

registerSafariNormalEventBattleContinuation("street_performer", (runtime, continuation) => {
  if (continuation.actionId !== "callout") throw new Error(`unsupported street_performer Battle continuation action: ${continuation.actionId}`);
  const state = stateOf(runtime);
  const index = Number(continuation.boardIndex);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "street_performer") throw new Error("street_performer continuation requires the originating board event");

  const owner = resolveStreetPerformer({
    event,
    action:"callout",
    current_day:Math.max(1, Math.trunc(Number(state.day) || 1)),
    scaling_value:scalingValue(state.day),
  });
  const battleRequest = (owner.operations ?? []).find((operation) => operation?.op === "start_trainer_battle");
  if (!battleRequest) throw new Error("street_performer fraud Battle continuation requires canonical trainer Battle request");

  state.board_events[index] = owner.event;
  state.board_visited[index] = true;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? []).filter((operation) => operation?.op !== "start_trainer_battle").map((operation) => structuredClone(operation)),
    { op:"request_save", reason:"normal_event_post_trainer_battle" },
  ];
  state.notice = "詐欺を指摘し、勝負を終えました。大道芸人のもとを離れます。";
  return {
    runtime,
    result:owner.outcome,
    completed:true,
    terminal:true,
    operations:state.last_operations,
    notice:state.notice,
    persistenceRequested:true,
    owner,
  };
});

export async function safariStreetPerformerChoices(runtime) {
  await ensureSafariGeneralData();
  const actions = [];
  for (const [partyIndex, pokemon] of (runtime?.player?.party ?? []).entries()) {
    if (!usablePokemon(pokemon)) continue;
    for (const type of safariPokemonTypes(pokemon)) {
      actions.push({
        id:`perform:${partyIndex}:${type}`,
        label:`${pokemonLabel(pokemon)}で${type}芸`,
        meta:"賞金＋EXP · 同タイプ技があれば賞金1.5倍＋道具",
      });
    }
  }
  return actions;
}

export async function resolveSafariStreetPerformerInteraction(runtime, index, requestedAction) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "street_performer") throw new Error("street_performer board event is required");
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", operations:[] };
  if (state.shop) return { runtime, result:"shop_active", operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const scale = scalingValue(state.day);
  const day = Math.max(1, Math.trunc(Number(state.day) || 1));
  const viewingPrice = 300 + scale * 30;
  const raw = String(requestedAction ?? "");

  if (raw.startsWith("perform:")) {
    await ensureSafariGeneralData();
    const [, indexText, typeText] = raw.split(":");
    const partyIndex = Number(indexText);
    const pokemon = runtime.player?.party?.[partyIndex];
    const type = String(typeText ?? "").trim().toUpperCase();
    const types = safariPokemonTypes(pokemon);
    if (!Number.isInteger(partyIndex) || !usablePokemon(pokemon) || !types.includes(type)) return { runtime, result:"pokemon_unavailable", completed:false, operations:[], persistenceRequested:false };

    const hasSameTypeMove = sameTypeMove(pokemon, type);
    const owner = resolveStreetPerformer({ event, action:"perform", current_day:day, scaling_value:scale, chosen_pokemon:pokemon, pokemon_types:types, used_type:type, same_type_move:hasSameTypeMove });
    const moneyOperation = (owner.operations ?? []).find((operation) => operation?.op === "add_money");
    const expOperation = (owner.operations ?? []).find((operation) => operation?.op === "gain_small_exp");
    if (!moneyOperation || !expOperation) throw new Error("street_performer perform canonical rewards are unresolved");

    let reward = null;
    let rewardItem = null;
    if (hasSameTypeMove) {
      rewardItem = safariDeterministicSmallRewardItem(event.normal_seed, STREET_REWARD_SALT);
      reward = preflightSafariSmallItemReward(runtime, rewardItem);
      if (!reward.success) {
        state.notice = "芸の追加報酬を受け取る空きがありません。バッグを空けてから挑戦してください。";
        return { runtime, result:"reward_bag_full", completed:false, operations:reward.operations.map((operation) => structuredClone(operation)), notice:state.notice, persistenceRequested:false };
      }
    }

    const exp = await grantSafariNormalEventPokemonExp(runtime, partyIndex, Number(expOperation.amount));
    const appliedOperations = [addMoney(runtime, Number(moneyOperation.amount))];
    appliedOperations.push(...exp.operations.map((operation) => ({ ...structuredClone(operation), scope:"street_performer" })));
    if (reward) {
      appliedOperations.push(...reward.operations.map((operation) => structuredClone(operation)));
      appliedOperations.push(...applySafariSmallItemReward(runtime, reward));
    }
    commitResolvedEvent(runtime, index, owner, appliedOperations);
    state.notice = hasSameTypeMove
      ? `${pokemonLabel(runtime.player.party[partyIndex])}が${type}芸を披露し、${moneyOperation.amount}円・EXP ${exp.expGained}・${rewardItem}を受け取りました。`
      : `${pokemonLabel(runtime.player.party[partyIndex])}が${type}芸を披露し、${moneyOperation.amount}円とEXP ${exp.expGained}を受け取りました。`;
    return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  if (raw === "watch") {
    const spendSuccess = Number(runtime.bag?.money ?? 0) >= viewingPrice;
    const owner = resolveStreetPerformer({ event, action:"watch", current_day:day, scaling_value:scale, spend_success:spendSuccess });
    if (!owner.result) {
      state.notice = `大道芸を見るには${viewingPrice}円必要です。`;
      return { runtime, result:owner.outcome, completed:false, viewingPrice, operations:owner.operations ?? [], notice:state.notice, persistenceRequested:false, owner };
    }
    runtime.bag ??= { slots: [], money: 0 };
    runtime.bag.money = Math.max(0, Math.trunc(Number(runtime.bag.money ?? 0)) - viewingPrice);
    healSafariPartyPercent(runtime, 10);
    state.mapless_exp_show_battles = 1;
    commitResolvedEvent(runtime, index, owner, [
      { op:"runtime_spend_money", amount:viewingPrice },
      { op:"runtime_heal_party_percent", amount:10, revive:false },
      { op:"runtime_set_exp_show", battles:1 },
    ]);
    state.notice = `大道芸を楽しみました。${viewingPrice}円を払い、手持ちが少し回復しました。`;
    return { runtime, result:owner.outcome, completed:true, viewingPrice, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  if (raw === "callout") {
    const owner = resolveStreetPerformer({ event, action:"callout", current_day:day, scaling_value:scale });
    const trainerBattle = (owner.operations ?? []).find((operation) => operation?.op === "start_trainer_battle");
    if (trainerBattle) {
      const started = await activateSafariNormalEventTrainerBattle(runtime, index, {
        eventId:"street_performer",
        actionId:"callout",
        battleEvent:trainerBattle,
        request:structuredClone(trainerBattle),
        payload:{ canonicalOutcome:owner.outcome },
      });
      if (started.result === "normal_event_trainer_battle_started" && state.battle) globalThis.__maplessNormalEventUi = null;
      return started;
    }
    commitResolvedEvent(runtime, index, owner, []);
    state.notice = "詐欺ではありませんでした。大道芸人のもとを離れました。";
    return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  if (raw === "leave") {
    const owner = resolveStreetPerformer({ event, action:"leave", current_day:day, scaling_value:scale });
    commitResolvedEvent(runtime, index, owner, []);
    state.notice = "大道芸人のもとを離れました。";
    return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  const choices = await safariStreetPerformerChoices(runtime);
  return { runtime, result:"unsupported_action", completed:false, availableActions:[...choices.map((entry) => entry.id), "watch", "callout", "leave"], operations:[], persistenceRequested:false };
}

export function interactiveSafariStreetPerformer(runtime, index) {
  const state = stateOf(runtime);
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  state.notice = "大道芸人が即席の舞台を開いています。画面の選択肢から行動してください。";
  return { runtime, result:"street_performer_ready", boundary:"normal_event", notice:state.notice, operations:[] };
}
