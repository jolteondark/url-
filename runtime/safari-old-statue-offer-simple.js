import {
  resolveSafariOldStatueInteraction as resolveBaseOldStatueInteraction,
  safariOldStatueBonusCandidates,
  safariOldStatuePrayNeedsPokemon,
  safariOldStatuePresentation as baseOldStatuePresentation,
} from "./safari-old-statue-pray-board-reveal.js";
import { resolveOldStatue } from "./mapless-old-statue-flow.js";
import { resolveMaplessOldStatueOutcomeV108 } from "./mapless-old-statue-v108-inputs.js";
import { maplessNormalEventScalingValue } from "./mapless-normal-event-medium-reward.js";
import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import {
  damageSafariPokemonPercent,
  healSafariPartyFull,
  inflictSafariOverworldStatus,
} from "./safari-pokemon-healing.js";

const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function eventAt(runtime, index) {
  const event = stateOf(runtime).board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "old_statue") throw new Error("old_statue board event is required");
  return event;
}

function quantityOf(runtime, itemId) {
  return (runtime?.bag?.slots ?? []).reduce((sum, slot) => {
    if (!Array.isArray(slot) || String(slot[0]) !== String(itemId)) return sum;
    const quantity = Number(slot[1]);
    return sum + (Number.isInteger(quantity) && quantity > 0 ? quantity : 0);
  }, 0);
}

function pockets(runtime) {
  return { general:{ slots:runtime?.bag?.slots ?? [], maxSlots:SAFARI_BAG_MAX_SLOTS, maxPerSlot:SAFARI_BAG_MAX_PER_SLOT } };
}

function itemMeta(itemId) {
  return { [itemId]:{ valid:true, pocket:"general" } };
}

function applyCost(runtime, transaction) {
  if (!transaction?.success) return [];
  runtime.bag ??= { slots:[], money:0 };
  runtime.bag.slots = transaction.pockets.general.slots.filter(Boolean);
  return (transaction.consumed ?? []).map((entry) => ({ op:"runtime_remove_item", item:entry.item, quantity:entry.quantity }));
}

function activePartyLead(runtime) {
  return (runtime?.player?.party ?? []).find((pokemon) => pokemon && Number(pokemon.steps_to_hatch ?? 0) <= 0 && Number(pokemon.hp ?? 0) > 0) ?? null;
}

function applyPartyDamage(runtime, percent) {
  runtime.player ??= { party:[] };
  runtime.player.party = (runtime.player.party ?? []).map((pokemon) => pokemon ? damageSafariPokemonPercent(pokemon, percent) : pokemon);
  return [{ op:"runtime_damage_party_percent", percent }];
}

function applyStatusToLead(runtime, status) {
  const pokemon = activePartyLead(runtime);
  if (!pokemon) return [];
  const index = runtime.player.party.indexOf(pokemon);
  runtime.player.party[index] = inflictSafariOverworldStatus(pokemon, status);
  return [{ op:"runtime_inflict_status", target:"active_party_0", party_index:index, status }];
}

function pending(runtime, result, notice) {
  const state = stateOf(runtime);
  state.notice = notice;
  return { runtime, result, completed:false, operations:[], notice, persistenceRequested:false };
}

function commit(runtime, index, owner, applied = []) {
  const state = stateOf(runtime);
  state.board_events[index] = owner.event;
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? []).map((operation) => structuredClone(operation)),
    ...applied,
    { op:"request_save", reason:"old_statue_resolved" },
  ];
  return state;
}

function offerOutcome(event) {
  return resolveMaplessOldStatueOutcomeV108({
    normalSeed:Number(event.normal_seed),
    roll:Number(event.normal_data?.offer_roll ?? 0),
    goodLimit:75,
    neutralLimit:95,
  });
}

function supportedSimpleOutcome(resolved) {
  if (resolved.branch === "good") return resolved.effectIndex === 0;
  if (resolved.branch === "neutral") return resolved.effectIndex === 1 || resolved.effectIndex === 2;
  if (resolved.branch === "bad") return resolved.effectIndex === 0 || resolved.effectIndex === 1;
  return false;
}

export { safariOldStatueBonusCandidates, safariOldStatuePrayNeedsPokemon };

export function safariOldStatueOfferEntries(runtime, index) {
  eventAt(runtime, index);
  return (runtime?.bag?.slots ?? []).flatMap((slot) => {
    if (!Array.isArray(slot) || slot.length < 2) return [];
    const id = String(slot[0] ?? "");
    const qty = Math.trunc(Number(slot[1] ?? 0));
    return id && qty > 0 ? [{ id, qty }] : [];
  });
}

export function safariOldStatuePresentation(runtime, index) {
  const presentation = baseOldStatuePresentation(runtime, index);
  return {
    ...presentation,
    actions:presentation.actions.map((action) => action.id === "offer"
      ? { ...action, meta:"所持道具を1個供えます。現在安全に接続済みの反応はその場で完了します" }
      : action),
  };
}

export async function resolveSafariOldStatueInteraction(runtime, index, requestedAction, options = {}) {
  const action = String(requestedAction ?? "");
  if (action !== "offer") return await resolveBaseOldStatueInteraction(runtime, index, action, options);

  const state = stateOf(runtime);
  const event = eventAt(runtime, index);
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", completed:false, operations:[] };
  if (state.shop) return { runtime, result:"shop_active", completed:false, operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", completed:true, operations:[] };

  const offeredItem = String(options?.offeredItem ?? "");
  if (!offeredItem) return pending(runtime, "old_statue_offer_cancelled", "供える道具を選びませんでした。道具もイベントも消費していません。");
  if (quantityOf(runtime, offeredItem) <= 0) return pending(runtime, "old_statue_offer_item_unavailable", "その道具はもう持っていません。道具もイベントも消費していません。");

  const resolved = offerOutcome(event);
  if (!supportedSimpleOutcome(resolved)) {
    return pending(runtime, `${resolved.branch}_${resolved.effectIndex}_offer_owner_pending`, "この供物への石像の反応は共有ownerへの接続待ちです。道具もイベントも消費していません。");
  }

  const transaction = resolveRewardTransaction({
    pockets:pockets(runtime),
    itemMeta:itemMeta(offeredItem),
    costs:[{ item:offeredItem, quantity:1 }],
  });
  if (!transaction.success) {
    return pending(runtime, "old_statue_offer_remove_failed", "供物を安全に消費できませんでした。道具もイベントも消費していません。");
  }

  const scale = maplessNormalEventScalingValue(state.day);
  const owner = resolveOldStatue({
    event,
    choice:"offer",
    offered_item:offeredItem,
    remove_result:true,
    scaling_value:scale,
    outcome:{ effect_index:resolved.effectIndex, status:resolved.status },
  });
  const applied = [
    ...(transaction.operations ?? []).map((operation) => structuredClone(operation)),
    ...applyCost(runtime, transaction),
  ];

  if (resolved.branch === "good" && resolved.effectIndex === 0) {
    healSafariPartyFull(runtime);
    applied.push({ op:"runtime_heal_party_full" });
    state.notice = `${offeredItem}を供えると、石像の加護で手持ちが全回復しました。`;
  } else if (resolved.branch === "neutral" && resolved.effectIndex === 1) {
    const amount = 300 + scale * 50;
    runtime.bag ??= { slots:[], money:0 };
    runtime.bag.money = Math.max(0, Math.trunc(Number(runtime.bag.money ?? 0))) + amount;
    applied.push({ op:"runtime_add_money", amount });
    state.notice = `${offeredItem}を供えると、石像の足元から${amount}円を見つけました。`;
  } else if (resolved.branch === "neutral" && resolved.effectIndex === 2) {
    state.notice = `${offeredItem}を供えましたが、石像は静かなままでした。`;
  } else if (resolved.branch === "bad" && resolved.effectIndex === 0) {
    const statusOps = applyStatusToLead(runtime, resolved.status);
    applied.push(...statusOps);
    state.notice = statusOps.length
      ? `${offeredItem}を供えると、石像の災いで先頭のポケモンが${resolved.status}になりました。`
      : `${offeredItem}を供えると、不穏な気配が漂いました。`;
  } else if (resolved.branch === "bad" && resolved.effectIndex === 1) {
    applied.push(...applyPartyDamage(runtime, 10));
    state.notice = `${offeredItem}を供えると、石像の災いで手持ち全体が傷つきました。`;
  }

  commit(runtime, index, owner, applied);
  return {
    runtime,
    result:owner.outcome,
    completed:true,
    offeredItem,
    operations:state.last_operations,
    notice:state.notice,
    persistenceRequested:true,
    owner,
    transaction,
  };
}
