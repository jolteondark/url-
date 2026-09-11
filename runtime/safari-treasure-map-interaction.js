import { commitSafariBagEconomyReceipt } from "./safari-bag-economy-receipt.js";
import { resolveCanonicalNormalEvent } from "./mapless-canonical-normal-event-dispatcher.js";
import { hasSafariUsablePartyType } from "./safari-pokemon-type-membership.js";
import { RubyMT19937Random } from "./ruby-mt19937-random.js";
import {
  applySafariSmallItemReward,
  preflightSafariSharedSmallItemReward,
} from "./safari-small-item-reward.js";
import {
  borrowSafariSharedRunRandomInt,
  ensureSafariEncounterSeed,
} from "./safari-encounter-randomization.js";
import { registerSafariNormalEventBattleContinuation } from "./safari-normal-event-battle-continuation.js";
import { activateSafariNormalEventTrainerBattle } from "./safari-web-combat-start.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function scalingValue(day) {
  return Math.max(Math.floor((Math.max(1, Number(day) || 1) - 1) / 5), 0);
}
function requestsSave(operations = []) {
  return operations.some((operation) => operation?.op === "request_save");
}
function sellerEvent(runtime, index) {
  const event = stateOf(runtime).board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "treasure_map_seller") throw new Error("treasure_map_seller board event is required");
  return event;
}
function fakeKnown(runtime, event) {
  return event?.normal_data?.fake === true && hasSafariUsablePartyType(runtime, "DARK");
}
function ownerInput(runtime, event, extra = {}) {
  const state = stateOf(runtime);
  return {
    event,
    existing_treasure_map: state.mapless_treasure_map ?? null,
    fake: event.normal_data?.fake === true,
    has_dark_type: hasSafariUsablePartyType(runtime, "DARK"),
    scaling_value: scalingValue(state.day),
    current_day: Math.max(1, Math.trunc(Number(state.day) || 1)),
    seed: Number(event.normal_seed ?? 0) & 0x7fffffff,
    ...extra,
  };
}
function commitOwner(runtime, index, owner, applied = []) {
  const state = stateOf(runtime);
  state.board_events[index] = owner.event;
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  state.board_consumed[index] = Boolean(owner.event?.normal_resolved);
  const setMap = (owner.operations ?? []).find((operation) => operation?.op === "set_treasure_map");
  if (setMap) state.mapless_treasure_map = structuredClone(setMap.value);
  state.last_operations = [
    ...(owner.operations ?? []).filter((operation) => !["spend_money", "grant_random", "add_money"].includes(operation?.op)).map((operation) => structuredClone(operation)),
    ...applied,
    { op:"request_save", reason:"treasure_map_seller_resolved" },
  ];
  return state;
}
function battleSucceeded(summary = {}) {
  const decision = Number(summary.decision);
  return decision === 1 || decision === 4;
}
function accusationRoll(event) {
  return new RubyMT19937Random(Number(event?.normal_seed ?? 0) & 0x7fffffff).randInt(100);
}
function sharedSmallReward(runtime) {
  const state = stateOf(runtime);
  ensureSafariEncounterSeed(state);
  const counter = state.preview_encounter_counter;
  const reward = preflightSafariSharedSmallItemReward(runtime, (limit) => borrowSafariSharedRunRandomInt(runtime, limit), 1);
  if (!reward.success) state.preview_encounter_counter = counter;
  return reward;
}
function trainerBattleOperation(owner) {
  return (owner.operations ?? []).find((operation) => operation?.op === "start_trainer_battle") ?? null;
}

registerSafariNormalEventBattleContinuation("treasure_map_seller", (runtime, continuation) => {
  if (continuation.actionId !== "accuse") throw new Error(`unsupported treasure_map_seller Battle continuation action: ${continuation.actionId}`);
  const state = stateOf(runtime);
  const index = Number(continuation.boardIndex);
  const event = sellerEvent(runtime, index);
  const success = battleSucceeded(continuation.battleReturn);
  const seededRoll = Number(continuation.payload?.seededRoll);
  const owner = resolveCanonicalNormalEvent("treasure_map_seller", ownerInput(runtime, event, {
    choice:0,
    seeded_roll:seededRoll,
    battle_result:continuation.battleReturn,
    battle_success:success,
    add_money_result:success,
  }));
  const money = (owner.operations ?? []).find((operation) => operation?.op === "add_money");
  const applied = [];
  if (success && money) {
    const receipt = commitSafariBagEconomyReceipt(runtime, { moneyDelta:Math.max(0, Math.trunc(Number(money.amount) || 0)) });
    if (!receipt.success) throw new Error(`treasure_map_seller accusation reward commit failed: ${receipt.result}`);
    applied.push(...(receipt.operations ?? []).map((operation) => structuredClone(operation)));
  }
  commitOwner(runtime, index, owner, applied);
  state.notice = success
    ? `贋作を売っていた相手との勝負に勝ち、${Math.max(0, Math.trunc(Number(money?.amount) || 0))}円を受け取りました。`
    : "贋作を売っていた相手との勝負を終えました。";
  return { runtime, result:owner.result, completed:true, terminal:true, operations:state.last_operations, notice:state.notice, persistenceRequested:requestsSave(state.last_operations), owner };
});

export function safariTreasureMapSellerPresentation(runtime, index) {
  const state = stateOf(runtime);
  const event = sellerEvent(runtime, index);
  const preview = resolveCanonicalNormalEvent("treasure_map_seller", ownerInput(runtime, event, { choice:-1 }));
  const choice = (preview.operations ?? []).find((operation) => operation?.op === "choice");
  const price = Math.max(0, Math.trunc(Number(choice?.price ?? 0)));
  const known = fakeKnown(runtime, event);
  return {
    title:"宝の地図売り",
    message: state.mapless_treasure_map
      ? "すでに別の宝の地図を持っています。"
      : known
        ? `あくタイプが地図を贋作だと見抜いています。${price}円で、あえて購入することもできます。`
        : `${price}円で宝の地図を売っています。地図の場所は翌日の分岐で開示されます。`,
    actions: state.mapless_treasure_map
      ? [{ id:"leave", label:"立ち去る", secondary:true }]
      : known
        ? [
            { id:"accuse", label:"偽物だと指摘する" },
            { id:"buy", label:"贋作と知りつつ購入する", meta:`${price}円` },
            { id:"leave", label:"購入せず立ち去る", secondary:true },
          ]
        : [
            { id:"buy", label:"地図を購入する", meta:`${price}円` },
            { id:"leave", label:"購入せず立ち去る", secondary:true },
          ],
    price,
    fakeKnown:known,
  };
}

export function resolveSafariTreasureMapSellerInteraction(runtime, index, action) {
  const state = stateOf(runtime);
  const event = sellerEvent(runtime, index);
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", completed:false, operations:[] };
  if (state.shop) return { runtime, result:"shop_active", completed:false, operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", completed:true, operations:[] };
  state.board_revealed[index] = true;
  state.board_visited[index] = true;

  const known = fakeKnown(runtime, event);
  const raw = String(action ?? "");
  if (!["buy", "leave"].includes(raw)) return { runtime, result:"unsupported_action", completed:false, operations:[], persistenceRequested:false };
  const choice = raw === "buy" ? (known ? 1 : 0) : (known ? 2 : 1);
  const preview = resolveCanonicalNormalEvent("treasure_map_seller", ownerInput(runtime, event, { choice:-1 }));
  const price = Math.max(0, Math.trunc(Number((preview.operations ?? []).find((operation) => operation?.op === "choice")?.price ?? 0)));

  if (raw === "buy") {
    if (state.mapless_treasure_map) {
      const owner = resolveCanonicalNormalEvent("treasure_map_seller", ownerInput(runtime, event, { choice }));
      commitOwner(runtime, index, owner);
      state.notice = "すでに別の宝の地図を持っているため、購入しませんでした。";
      return { runtime, result:owner.result, completed:true, price, operations:state.last_operations, notice:state.notice, persistenceRequested:requestsSave(state.last_operations), owner };
    }
    const canSpend = Number(runtime.bag?.money ?? 0) >= price;
    const owner = resolveCanonicalNormalEvent("treasure_map_seller", ownerInput(runtime, event, { choice, spend_money_result:canSpend }));
    if (!canSpend || !(owner.operations ?? []).some((operation) => operation?.op === "set_treasure_map")) {
      state.notice = `地図を買うには${price}円必要です。`;
      return { runtime, result:owner.result, completed:false, price, operations:owner.operations ?? [], notice:state.notice, persistenceRequested:false, owner };
    }
    const receipt = commitSafariBagEconomyReceipt(runtime, { moneyDelta:-price });
    if (!receipt.success) {
      state.notice = `地図を買うには${price}円必要です。`;
      return { runtime, result:receipt.result, completed:false, price, operations:receipt.operations ?? [], notice:state.notice, persistenceRequested:false, owner };
    }
    commitOwner(runtime, index, owner, (receipt.operations ?? []).map((operation) => structuredClone(operation)));
    state.notice = "宝の地図を購入しました。場所は翌日の分岐で開示されます。";
    return { runtime, result:owner.result, completed:true, price, operations:state.last_operations, notice:state.notice, persistenceRequested:requestsSave(state.last_operations), owner };
  }

  const owner = resolveCanonicalNormalEvent("treasure_map_seller", ownerInput(runtime, event, { choice }));
  commitOwner(runtime, index, owner);
  state.notice = "宝の地図を買わずに立ち去りました。";
  return { runtime, result:owner.result, completed:true, price, operations:state.last_operations, notice:state.notice, persistenceRequested:requestsSave(state.last_operations), owner };
}

export async function resolveSafariTreasureMapSellerAccusation(runtime, index) {
  const state = stateOf(runtime);
  const event = sellerEvent(runtime, index);
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", completed:false, operations:[] };
  if (state.shop) return { runtime, result:"shop_active", completed:false, operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", completed:true, operations:[] };
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  if (!fakeKnown(runtime, event)) return { runtime, result:"accuse_unavailable", completed:false, operations:[], persistenceRequested:false };

  const seededRoll = accusationRoll(event);
  if (seededRoll < 50) {
    const reward = sharedSmallReward(runtime);
    const owner = resolveCanonicalNormalEvent("treasure_map_seller", ownerInput(runtime, event, {
      choice:0,
      seeded_roll:seededRoll,
      grant_random_result:reward.success,
    }));
    const applied = reward.success
      ? [...(reward.operations ?? []).map((operation) => structuredClone(operation)), ...applySafariSmallItemReward(runtime, reward)]
      : [...(reward.operations ?? []).map((operation) => structuredClone(operation))];
    commitOwner(runtime, index, owner, applied);
    state.notice = reward.success
      ? `贋作を指摘すると、${reward.selectedItems?.[0] ?? "道具"}を置いて逃げていきました。`
      : "贋作を指摘すると相手は逃げましたが、バッグがいっぱいで落とした道具は持ち帰れませんでした。";
    return { runtime, result:owner.result, completed:true, reward, seededRoll, operations:state.last_operations, notice:state.notice, persistenceRequested:requestsSave(state.last_operations), owner };
  }

  const owner = resolveCanonicalNormalEvent("treasure_map_seller", ownerInput(runtime, event, {
    choice:0,
    seeded_roll:seededRoll,
    battle_success:false,
  }));
  const battleOperation = trainerBattleOperation(owner);
  if (!battleOperation?.request) throw new Error("treasure_map_seller accusation route requires canonical trainer Battle request");
  const started = await activateSafariNormalEventTrainerBattle(runtime, index, {
    eventId:"treasure_map_seller",
    actionId:"accuse",
    battleEvent:structuredClone(battleOperation.request),
    request:structuredClone(battleOperation),
    payload:{ seededRoll },
  });
  if (started.result === "normal_event_trainer_battle_started" && state.battle) globalThis.__maplessNormalEventUi = null;
  return started;
}

export function interactiveSafariTreasureMapSeller(runtime, index) {
  const state = stateOf(runtime);
  const ui = safariTreasureMapSellerPresentation(runtime, index);
  state.notice = ui.message;
  const confirmFn = typeof globalThis.confirm === "function" ? globalThis.confirm.bind(globalThis) : null;
  if (!confirmFn) return { runtime, result:"treasure_map_seller_ready", boundary:"normal_event", notice:state.notice, availableActions:ui.actions.map((action) => action.id), operations:[] };
  if (ui.fakeKnown && ui.actions.some((action) => action.id === "accuse")) {
    const accuse = confirmFn(`${ui.message}\n\n偽物だと指摘しますか？`);
    if (accuse) return resolveSafariTreasureMapSellerAccusation(runtime, index);
  }
  const buy = ui.actions.some((action) => action.id === "buy") && confirmFn(`${ui.message}\n\n購入しますか？`);
  return resolveSafariTreasureMapSellerInteraction(runtime, index, buy ? "buy" : "leave");
}