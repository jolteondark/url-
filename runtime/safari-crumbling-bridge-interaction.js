import { setMoney } from "./bag-economy-mart-flow.js";
import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { resolveCrumblingBridge } from "./mapless-crumbling-bridge-flow.js";
import {
  MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS,
  maplessNormalEventScalingValue,
  resolveMaplessNormalEventMediumReward,
} from "./mapless-normal-event-medium-reward.js";
import { MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS } from "./mapless-normal-event-small-reward.js";
import { projectMaplessNormalEventOptionalReward } from "./mapless-normal-event-optional-reward.js";
import {
  MAPLESS_V108_TREASURE_CHEST_REWARD_ENTRIES,
  resolveMaplessV108TreasureChestReward,
} from "./mapless-v108-treasure-chest.js";
import {
  borrowSafariSharedRunRandomInt,
  ensureSafariEncounterSeed,
} from "./safari-encounter-randomization.js";
import { damageSafariPokemonFlat, damageSafariPokemonPercent } from "./safari-pokemon-healing.js";
import { hasSafariUsablePartyType, safariPokemonTypes } from "./safari-pokemon-type-membership.js";

const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;
const SAFARI_MAX_MONEY = 999999;
const REWARD_ITEM_IDS = Object.freeze([...new Set([
  ...MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS,
  ...MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS,
  ...MAPLESS_V108_TREASURE_CHEST_REWARD_ENTRIES.map((entry) => entry.id),
])]);
const ITEM_META = Object.freeze(Object.fromEntries(
  REWARD_ITEM_IDS.map((id) => [id, Object.freeze({ valid:true, pocket:"general" })]),
));

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function usable(pokemon) {
  return Boolean(pokemon) && Number(pokemon.hp ?? 0) > 0 && pokemon.egg !== true;
}

function firstUsablePokemonOfType(runtime, typeId) {
  const wanted = String(typeId).toUpperCase();
  return (runtime.player?.party ?? []).find((pokemon) => usable(pokemon) && safariPokemonTypes(pokemon).includes(wanted)) ?? null;
}

function rewardPockets(runtime) {
  return {
    general:{
      slots:runtime.bag?.slots ?? [],
      maxSlots:SAFARI_BAG_MAX_SLOTS,
      maxPerSlot:SAFARI_BAG_MAX_PER_SLOT,
    },
  };
}

function applyReward(runtime, reward) {
  if (!reward?.success) return [];
  runtime.bag ??= { slots:[], money:0 };
  runtime.bag.slots = reward.pockets.general.slots.filter(Boolean);
  return (reward.granted ?? []).map((entry) => ({ op:"runtime_grant_item", item:entry.item, quantity:entry.quantity }));
}

function addMoney(runtime, amount) {
  runtime.bag ??= { slots:[], money:0 };
  const before = Number(runtime.bag.money ?? 0);
  runtime.bag.money = setMoney(before + Math.max(0, Math.trunc(Number(amount) || 0)), SAFARI_MAX_MONEY);
  return { op:"runtime_add_money", requested:Math.max(0, Math.trunc(Number(amount) || 0)), applied:runtime.bag.money - before };
}

function sharedMediumReward(runtime, day) {
  const state = stateOf(runtime);
  ensureSafariEncounterSeed(state);
  const counter = state.preview_encounter_counter;
  const reward = resolveMaplessNormalEventMediumReward({
    day,
    count:1,
    randomInt:(limit) => borrowSafariSharedRunRandomInt(runtime, limit),
    pockets:rewardPockets(runtime),
    itemMeta:ITEM_META,
  });
  if (!reward.success) state.preview_encounter_counter = counter;
  return reward;
}

function normalTreasureReward(runtime, event, day) {
  const treasure = resolveMaplessV108TreasureChestReward({
    kind:"treasure",
    chest_tier:"normal",
    chest_seed:Number(event.normal_seed) & 0x7fffffff,
    chest_generated_day:day,
  }, day);
  const flattened = treasure.items.flatMap(({ itemId, quantity }) => Array.from({ length:Number(quantity) }, () => itemId));
  const reward = resolveRewardTransaction({ pockets:rewardPockets(runtime), itemMeta:ITEM_META, items:flattened });
  return { treasure, reward };
}

function applyOwnerDamage(runtime, operations) {
  const applied = [];
  for (const operation of operations ?? []) {
    if (operation.op === "damage_pokemon" && operation.target === "active_party_0") {
      const pokemon = runtime.player?.party?.[0];
      if (!usable(pokemon)) continue;
      runtime.player.party[0] = damageSafariPokemonFlat(pokemon, operation.amount);
      applied.push({ op:"runtime_damage_pokemon", partyIndex:0, amount:Number(operation.amount) });
    } else if (operation.op === "damage_party") {
      runtime.player.party = (runtime.player?.party ?? []).map((pokemon) => usable(pokemon)
        ? damageSafariPokemonPercent(pokemon, operation.amount)
        : pokemon);
      applied.push({ op:"runtime_damage_party", percent:Number(operation.amount) });
    }
  }
  return applied;
}

function commit(runtime, index, owner, extraOperations, notice) {
  const state = stateOf(runtime);
  state.board_events[index] = owner.event;
  state.board_consumed[index] = Boolean(owner.event?.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? []).map((operation) => structuredClone(operation)),
    ...extraOperations,
    { op:"request_save", reason:"crumbling_bridge" },
  ];
  state.notice = notice;
  return {
    runtime,
    result:owner.outcome,
    completed:Boolean(owner.result),
    operations:state.last_operations,
    notice:state.notice,
    persistenceRequested:Boolean(owner.result),
    owner,
  };
}

export function safariCrumblingBridgePresentation(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "crumbling_bridge") throw new Error("crumbling_bridge board event is required");
  const flying = hasSafariUsablePartyType(runtime, "FLYING");
  const psychic = hasSafariUsablePartyType(runtime, "PSYCHIC");
  return {
    title:"崩れかけた橋",
    message:flying || psychic
      ? "古い橋が崩れかけています。手持ちの力を借りれば安全に渡れそうです。"
      : "古い橋が崩れかけています。慎重に渡るか、引き返せます。",
    actions:[
      ...(flying ? [{ id:"safe_flying", label:"ひこうタイプに助けてもらう", meta:"安全に渡る" }] : []),
      ...(psychic ? [{ id:"safe_psychic", label:"エスパータイプに支えてもらう", meta:"安全に渡る" }] : []),
      { id:"careful", label:"慎重に渡る", meta:"橋が崩れる危険があります" },
      { id:"leave", label:"引き返す", secondary:true },
    ],
  };
}

export function openSafariCrumblingBridgeTouch(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "crumbling_bridge") throw new Error("crumbling_bridge board event is required");
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const presentation = safariCrumblingBridgePresentation(runtime, index);
  state.notice = presentation.message;
  if (typeof globalThis.document !== "undefined") {
    globalThis.__maplessNormalEventUi = {
      runtime,
      boardIndex:index,
      eventId:"crumbling_bridge",
      ...presentation,
    };
  }
  return { runtime, result:"crumbling_bridge_ready", boundary:"normal_event", notice:state.notice, operations:[] };
}

export function resolveSafariCrumblingBridgeInteraction(runtime, index, requestedAction) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "crumbling_bridge") throw new Error("crumbling_bridge board event is required");
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", operations:[] };
  if (state.shop) return { runtime, result:"shop_active", operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const action = String(requestedAction ?? "");
  const flying = hasSafariUsablePartyType(runtime, "FLYING");
  const psychic = hasSafariUsablePartyType(runtime, "PSYCHIC");
  const availableActions = [...(flying ? ["safe_flying"] : []), ...(psychic ? ["safe_psychic"] : []), "careful", "leave"];
  if (!availableActions.includes(action)) return { runtime, result:"unsupported_action", completed:false, operations:[], availableActions };

  const chosenPokemon = action === "safe_flying"
    ? firstUsablePokemonOfType(runtime, "FLYING")
    : action === "safe_psychic" ? firstUsablePokemonOfType(runtime, "PSYCHIC") : null;
  const scale = maplessNormalEventScalingValue(state.day);
  const rewardKind = String(event.normal_data?.reward_kind ?? "rescue");
  let reward = null;
  let treasure = null;

  if (action !== "leave" && !(action === "careful" && Number(event.normal_data?.careful_roll ?? 0) >= 90)) {
    if (rewardKind === "treasure") {
      const prepared = normalTreasureReward(runtime, event, state.day);
      treasure = prepared.treasure;
      reward = prepared.reward;
    } else {
      reward = sharedMediumReward(runtime, state.day);
    }
  }

  const owner = resolveCrumblingBridge({
    event,
    action,
    has_flying:flying,
    has_psychic:psychic,
    chosen_pokemon:chosenPokemon,
    current_day:state.day,
    scaling_value:scale,
    chest_result:rewardKind === "treasure" ? reward?.success !== false : undefined,
    money_result:true,
    random_reward_result:rewardKind === "treasure" ? undefined : reward?.success !== false,
    damage_result:true,
  });

  const extras = applyOwnerDamage(runtime, owner.operations);
  if (owner.result && reward) {
    if (rewardKind === "treasure") {
      extras.push(...applyReward(runtime, reward));
      if (reward.success && treasure) extras.push(addMoney(runtime, treasure.money));
    } else {
      const optional = projectMaplessNormalEventOptionalReward({ ownerResult:owner, rewardResult:reward });
      if (reward.success) extras.push(...applyReward(runtime, reward));
      else extras.push(...optional.rewardOperations.map((operation) => structuredClone(operation)));
      extras.push(addMoney(runtime, 800 + scale * 120));
    }
  }

  const notice = owner.outcome === "left"
    ? "危険な橋を渡らず引き返しました。"
    : owner.outcome === "bridge_collapsed"
      ? "橋が崩れ、手持ち全員が少し傷つきました。"
      : owner.outcome === "careful_injured"
        ? "橋は渡れましたが、先頭のポケモンが傷つきました。"
        : reward?.success === false
          ? "橋を渡り切りましたが、バッグがいっぱいで道具は持ち帰れませんでした。"
          : "橋を無事に渡り、向こう側の報酬を受け取りました。";
  return commit(runtime, index, owner, extras, notice);
}
