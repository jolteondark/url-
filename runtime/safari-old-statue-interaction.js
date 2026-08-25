import { resolveOldStatue } from "./mapless-old-statue-flow.js";
import { resolveMaplessOldStatueOutcomeV108 } from "./mapless-old-statue-v108-inputs.js";
import {
  MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS,
} from "./mapless-normal-event-small-reward.js";
import {
  MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS,
  maplessNormalEventScalingValue,
  resolveMaplessNormalEventMediumReward,
} from "./mapless-normal-event-medium-reward.js";
import { borrowSafariSharedRunRandomInt, ensureSafariEncounterSeed } from "./safari-encounter-randomization.js";
import {
  damageSafariPokemonPercent,
  healSafariPartyFull,
  inflictSafariOverworldStatus,
} from "./safari-pokemon-healing.js";

const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;
const MEDIUM_ITEM_META = Object.freeze(Object.fromEntries(
  [...MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS, ...MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS]
    .map((id) => [id, Object.freeze({ valid:true, pocket:"general" })]),
));

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

function rewardPockets(runtime) {
  return { general:{ slots:runtime?.bag?.slots ?? [], maxSlots:SAFARI_BAG_MAX_SLOTS, maxPerSlot:SAFARI_BAG_MAX_PER_SLOT } };
}

function sharedMediumReward(runtime) {
  const state = stateOf(runtime);
  ensureSafariEncounterSeed(state);
  const counter = state.preview_encounter_counter;
  const reward = resolveMaplessNormalEventMediumReward({
    day:Math.max(1, Math.trunc(Number(state.day) || 1)),
    count:1,
    randomInt:(max) => borrowSafariSharedRunRandomInt(runtime, max),
    itemMeta:MEDIUM_ITEM_META,
    pockets:rewardPockets(runtime),
  });
  if (!reward.success) state.preview_encounter_counter = counter;
  return reward;
}

function applyReward(runtime, reward) {
  if (!reward?.success) return [];
  runtime.bag ??= { slots:[], money:0 };
  runtime.bag.slots = reward.pockets.general.slots.filter(Boolean);
  return (reward.granted ?? []).map((entry) => ({ op:"runtime_grant_item", item:entry.item, quantity:entry.quantity }));
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
  const next = inflictSafariOverworldStatus(pokemon, status);
  runtime.player.party[index] = next;
  return [{ op:"runtime_inflict_status", target:"active_party_0", party_index:index, status }];
}

function pending(runtime, result, notice) {
  const state = stateOf(runtime);
  state.notice = notice;
  return { runtime, result, completed:false, operations:[], notice, persistenceRequested:false };
}

export function safariOldStatuePresentation(runtime, index) {
  const event = eventAt(runtime, index);
  return {
    title:"古びた石像",
    message:"風化した石像があります。祈るか、何かを供えるか、壊すか選べます。",
    actions:[
      { id:"pray", label:"祈る", meta:"回復・道具・お金・災いなど、石像の反応は様々です" },
      { id:"offer", label:"道具を供える", meta:"供物選択を含むSafari接続を準備中" },
      { id:"break", label:"石像を壊す", meta:"守護者戦など残りの共有owner接続を準備中" },
      { id:"leave", label:"立ち去る", secondary:true },
    ],
    event,
  };
}

export function resolveSafariOldStatueInteraction(runtime, index, requestedAction) {
  const state = stateOf(runtime);
  const event = eventAt(runtime, index);
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", completed:false, operations:[] };
  if (state.shop) return { runtime, result:"shop_active", completed:false, operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", completed:true, operations:[] };
  state.board_revealed[index] = true;
  state.board_visited[index] = true;

  const action = String(requestedAction ?? "");
  if (action === "leave") {
    const owner = resolveOldStatue({ event, choice:"leave" });
    commit(runtime, index, owner);
    state.notice = "古びた石像を離れました。";
    return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  if (action === "offer") {
    return pending(runtime, "old_statue_offer_owner_pending", "供物の選択・原子的な消費まで共有Bag ownerへ接続中です。道具もイベントも消費していません。");
  }
  if (action === "break") {
    return pending(runtime, "old_statue_break_owner_pending", "石像を壊す分岐は守護者Battleを含む共有ownerへ接続中です。イベントは消費していません。");
  }
  if (action !== "pray") {
    return { runtime, result:"unsupported_action", completed:false, operations:[], persistenceRequested:false };
  }

  const roll = Number(event.normal_data?.pray_roll ?? 0);
  const resolved = resolveMaplessOldStatueOutcomeV108({
    normalSeed:Number(event.normal_seed),
    roll,
    goodLimit:50,
    neutralLimit:80,
  });
  const outcome = { effect_index:resolved.effectIndex, status:resolved.status };

  if (resolved.branch === "good" && resolved.effectIndex === 0) {
    const owner = resolveOldStatue({ event, choice:"pray", outcome });
    healSafariPartyFull(runtime);
    commit(runtime, index, owner, [{ op:"runtime_heal_party_full" }]);
    state.notice = "石像の加護で手持ちが全回復しました。";
    return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  if (resolved.branch === "good" && resolved.effectIndex === 2) {
    const reward = sharedMediumReward(runtime);
    if (!reward.success) {
      return pending(runtime, "reward_bag_full", "石像から授かる道具を受け取るバッグの空きがありません。イベントと共有RNGは消費していません。");
    }
    const owner = resolveOldStatue({ event, choice:"pray", outcome });
    const applied = [
      ...(reward.operations ?? []).map((operation) => structuredClone(operation)),
      ...applyReward(runtime, reward),
    ];
    commit(runtime, index, owner, applied);
    state.notice = `石像から${reward.selectedItems?.join("・") ?? "道具"}を授かりました。`;
    return { runtime, result:owner.outcome, completed:true, reward, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  if (resolved.branch === "neutral" && resolved.effectIndex === 1) {
    const scale = maplessNormalEventScalingValue(state.day);
    const amount = 300 + scale * 50;
    const owner = resolveOldStatue({ event, choice:"pray", scaling_value:scale, outcome });
    runtime.bag ??= { slots:[], money:0 };
    runtime.bag.money = Math.max(0, Math.trunc(Number(runtime.bag.money ?? 0))) + amount;
    commit(runtime, index, owner, [{ op:"runtime_add_money", amount }]);
    state.notice = `石像の足元から${amount}円を見つけました。`;
    return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  if (resolved.branch === "neutral" && resolved.effectIndex === 2) {
    const owner = resolveOldStatue({ event, choice:"pray", outcome });
    commit(runtime, index, owner);
    state.notice = "祈りましたが、石像は静かなままでした。";
    return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  if (resolved.branch === "bad" && resolved.effectIndex === 0) {
    const owner = resolveOldStatue({ event, choice:"pray", outcome });
    const applied = applyStatusToLead(runtime, resolved.status);
    commit(runtime, index, owner, applied);
    state.notice = applied.length ? `石像の災いで先頭のポケモンが${resolved.status}になりました。` : "石像から不穏な気配が漂いました。";
    return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  if (resolved.branch === "bad" && resolved.effectIndex === 1) {
    const owner = resolveOldStatue({ event, choice:"pray", outcome });
    const applied = applyPartyDamage(runtime, 10);
    commit(runtime, index, owner, applied);
    state.notice = "石像の災いで手持ち全体が傷つきました。";
    return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  const result = `${resolved.branch}_${resolved.effectIndex}_owner_pending`;
  return pending(runtime, result, "この石像の反応は共有Battle/Bag/Pokémon/Board ownerへの接続待ちです。イベントは消費していません。");
}
