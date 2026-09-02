import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { resolveBerryContest } from "./mapless-berry-contest-flow.js";
import {
  MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS,
  pickMaplessNormalEventMediumRewards,
} from "./mapless-normal-event-medium-reward.js";
import {
  MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS,
  pickMaplessNormalEventSmallRewards,
} from "./mapless-normal-event-small-reward.js";
import {
  MAPLESS_V108_BERRY_IDS,
  canonicalBerryEntriesFromBagSlots,
  canonicalBerryGrade,
  canonicalBerryRewardPool,
} from "./mapless-v108-berry-catalog.js";
import { RubyMT19937Random } from "./ruby-mt19937-random.js";
import {
  borrowSafariSharedRunRandomInt,
  ensureSafariEncounterSeed,
} from "./safari-encounter-randomization.js";

const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;
const RANDOM_REWARD_IDS = Object.freeze([
  ...new Set([...MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS, ...MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS]),
]);

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function bagSlots(runtime) { return runtime.bag?.slots ?? []; }
function dayOf(runtime) { return Math.max(1, Math.trunc(Number(stateOf(runtime).day) || 1)); }
function itemMeta(ids) { return Object.fromEntries([...new Set(ids)].map((id) => [id, { valid:true, pocket:"general" }])); }
function randomRewardMeta() { return itemMeta(RANDOM_REWARD_IDS); }
function berryEntries(runtime) {
  return canonicalBerryEntriesFromBagSlots(bagSlots(runtime)).map(([id, qty]) => ({ id, qty, grade:canonicalBerryGrade(id) }));
}
function transaction(runtime, items = [], costs = []) {
  if (items.length === 0 && costs.length === 0) return { success:true, pockets:{ general:{ slots:bagSlots(runtime) } }, operations:[], consumed:[], granted:[] };
  const ids = [...MAPLESS_V108_BERRY_IDS, ...RANDOM_REWARD_IDS, ...items, ...costs.map((entry) => entry.item)];
  return resolveRewardTransaction({
    pockets:{ general:{ slots:bagSlots(runtime), maxSlots:SAFARI_BAG_MAX_SLOTS, maxPerSlot:SAFARI_BAG_MAX_PER_SLOT } },
    itemMeta:itemMeta(ids),
    items,
    costs,
  });
}
function applyTransaction(runtime, resolved) {
  if (!resolved?.success) return [];
  runtime.bag ??= { slots:[], money:0 };
  runtime.bag.slots = resolved.pockets.general.slots.filter(Boolean);
  return [
    ...(resolved.consumed ?? []).map((entry) => ({ op:"runtime_remove_item", item:entry.item, quantity:entry.quantity })),
    ...(resolved.granted ?? []).map((entry) => ({ op:"runtime_grant_item", item:entry.item, quantity:entry.quantity })),
  ];
}
function seededBulkRewardCount(event) {
  const rng = new RubyMT19937Random(Number(event?.normal_seed ?? 0) & 0x7fffffff);
  return 1 + rng.randInt(2);
}
function drawBerryGrade(runtime, grade, count, exclude = null) {
  const pool = canonicalBerryRewardPool(grade, exclude);
  if (pool.length === 0) return [];
  return Array.from({ length:Math.max(0, Math.trunc(Number(count) || 0)) }, () => pool[borrowSafariSharedRunRandomInt(runtime, pool.length)]);
}
function projectConcreteRewards(runtime, owner) {
  const items = [];
  const selectionOperations = [];
  for (const operation of owner.operations ?? []) {
    if (operation?.op === "reward_berry_grade") {
      const picked = drawBerryGrade(runtime, operation.grade, operation.count, operation.exclude ?? null);
      items.push(...picked);
      picked.forEach((item, draw) => selectionOperations.push({ op:"select_berry_contest_reward", grade:operation.grade, draw, item }));
    }
    if (operation?.op === "grant_random") {
      const picker = operation.tier === "medium" ? pickMaplessNormalEventMediumRewards : pickMaplessNormalEventSmallRewards;
      const selected = picker({
        day:dayOf(runtime),
        count:Math.max(0, Math.trunc(Number(operation.quantity) || 0)),
        randomInt:(max) => borrowSafariSharedRunRandomInt(runtime, max),
        itemMeta:randomRewardMeta(),
      });
      items.push(...selected.items);
      selectionOperations.push(...selected.operations.map((entry) => structuredClone(entry)));
    }
  }
  return { items, selectionOperations };
}
function costsFromOwner(owner) {
  return (owner.operations ?? [])
    .filter((operation) => operation?.op === "remove_item")
    .map((operation) => ({ item:String(operation.item), quantity:Math.max(0, Math.trunc(Number(operation.quantity) || 0)) }))
    .filter((entry) => entry.item && entry.quantity > 0);
}
function commit(runtime, index, owner, resolved, selectionOperations) {
  const state = stateOf(runtime);
  const applied = applyTransaction(runtime, resolved);
  state.board_events[index] = owner.event;
  state.board_visited[index] = true;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? []).filter((operation) => !["remove_item","reward_berry_grade","grant_random"].includes(operation?.op)).map((operation) => structuredClone(operation)),
    ...selectionOperations,
    ...(resolved?.operations ?? []).map((operation) => structuredClone(operation)),
    ...applied,
    { op:"request_save", reason:"berry_contest_resolved" },
  ];
  return applied;
}

export function safariBerryContestBerryChoices(runtime) {
  return berryEntries(runtime).map((entry) => ({ ...entry }));
}

export function resolveSafariBerryContestInteraction(runtime, index, requestedAction) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "berry_contest") throw new Error("berry_contest board event is required");
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", operations:[] };
  if (state.shop) return { runtime, result:"shop_active", operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };
  state.board_revealed[index] = true;
  state.board_visited[index] = true;

  const raw = String(requestedAction ?? "");
  const selectedBerry = raw.startsWith("single:") ? raw.slice(7) : null;
  const action = selectedBerry ? "single" : raw;
  const entries = berryEntries(runtime);
  const generalCount = entries.filter((entry) => entry.grade === 0).reduce((sum, entry) => sum + entry.qty, 0);
  const availableActions = [
    ...entries.map((entry) => `single:${entry.id}`),
    ...(generalCount >= 3 ? ["bulk"] : []),
    "watch",
    "leave",
  ];
  if (!availableActions.includes(raw)) return { runtime, result:"unsupported_action", completed:false, availableActions, operations:[], persistenceRequested:false };

  const owner = resolveBerryContest({
    event,
    action,
    selected_berry:selectedBerry,
    berry_entries:entries,
    remove_result:true,
    seeded_reward_count:seededBulkRewardCount(event),
    random_reward_result:true,
  });
  if (!owner.result) return { runtime, result:owner.outcome, completed:false, availableActions, operations:owner.operations ?? [], persistenceRequested:false, owner };

  ensureSafariEncounterSeed(state);
  const counter = state.preview_encounter_counter;
  const projected = projectConcreteRewards(runtime, owner);
  const costs = costsFromOwner(owner);
  const resolved = transaction(runtime, projected.items, costs);
  if (!resolved.success) {
    state.preview_encounter_counter = counter;
    state.notice = resolved.result === "not_enough_items"
      ? "出品するきのみが足りません。"
      : "賞品を受け取るバッグの空きがありません。出品するきのみは消費していません。";
    return {
      runtime,
      result:resolved.result ?? "reward_bag_full",
      completed:false,
      availableActions,
      operations:[...(owner.operations ?? []), ...(resolved.operations ?? [])],
      notice:state.notice,
      persistenceRequested:false,
      owner,
    };
  }

  commit(runtime, index, owner, resolved, projected.selectionOperations);
  const awarded = (resolved.granted ?? []).map((entry) => entry.item);
  state.notice = owner.outcome === "winner"
    ? `きのみ品評会で優勝しました。${awarded.length ? ` ${awarded.join("・")}を受け取りました。` : ""}`
    : owner.outcome === "placed"
      ? `きのみ品評会で入賞しました。${awarded.length ? ` ${awarded.join("・")}を受け取りました。` : ""}`
      : owner.outcome === "participation"
        ? `きのみを出品しました。${awarded.length ? ` ${awarded.join("・")}を受け取りました。` : ""}`
        : owner.outcome === "bulk_bonus" || owner.outcome === "bulk"
          ? `きのみ3個を詰め合わせで出品しました。${awarded.length ? ` ${awarded.join("・")}を受け取りました。` : ""}`
          : owner.outcome === "watched"
            ? `品評会を見物しました。${awarded.length ? ` ${awarded.join("・")}を受け取りました。` : ""}`
            : "きのみ品評会を離れました。";
  return {
    runtime,
    result:owner.outcome,
    completed:true,
    operations:state.last_operations,
    notice:state.notice,
    persistenceRequested:true,
    owner,
    reward:resolved,
  };
}
