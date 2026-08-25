import { resolveTrainerCamp } from "./mapless-trainer-camp-flow.js";
import {
  MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS,
  resolveMaplessNormalEventMediumReward,
} from "./mapless-normal-event-medium-reward.js";
import {
  MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS,
  resolveMaplessNormalEventSmallReward,
} from "./mapless-normal-event-small-reward.js";
import {
  borrowSafariSharedRunRandomInt,
  ensureSafariEncounterSeed,
} from "./safari-encounter-randomization.js";
import { ensureSafariGeneralData } from "./safari-general-data-demand.js";
import { grantSafariNormalEventPokemonExp } from "./safari-normal-event-exp-owner.js";
import { healSafariPartyPercent } from "./safari-pokemon-healing.js";
import { safariPokemonTypes } from "./safari-pokemon-type-membership.js";

const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;
const REWARD_ITEM_META = Object.freeze(Object.fromEntries(
  [...MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS, ...MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS]
    .map((id) => [id, Object.freeze({ valid:true, pocket:"general" })]),
));

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function scalingValue(day) { return Math.max(Math.floor((Math.max(1, Number(day) || 1) - 1) / 5), 0); }
function dayOf(state) { return Math.max(1, Math.trunc(Number(state.day) || 1)); }
function usablePokemon(pokemon) { return Boolean(pokemon) && pokemon.egg !== true && Number(pokemon.hp ?? 0) > 0; }
function pokemonLabel(pokemon) {
  const name = String(pokemon?.nickname || pokemon?.species || "ポケモン");
  const level = Number(pokemon?.level);
  return Number.isFinite(level) ? `${name} Lv.${level}` : name;
}
function rewardPockets(runtime) {
  return { general:{ slots:runtime?.bag?.slots ?? [], maxSlots:SAFARI_BAG_MAX_SLOTS, maxPerSlot:SAFARI_BAG_MAX_PER_SLOT } };
}
function sharedReward(runtime, tier) {
  const state = stateOf(runtime);
  ensureSafariEncounterSeed(state);
  const counter = state.preview_encounter_counter;
  const common = {
    count:1,
    randomInt:(max) => borrowSafariSharedRunRandomInt(runtime, max),
    itemMeta:REWARD_ITEM_META,
    pockets:rewardPockets(runtime),
  };
  const reward = tier === "medium"
    ? resolveMaplessNormalEventMediumReward({ ...common, day:dayOf(state) })
    : resolveMaplessNormalEventSmallReward(common);
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
    { op:"request_save", reason:"trainer_camp_resolved" },
  ];
  return state;
}
function campProbe(event, scale, type = null) {
  return resolveTrainerCamp({ event, scaling_value:scale, suitable_type:type });
}
function presentationOperation(owner) {
  return (owner.operations ?? []).find((operation) => operation?.op === "present_camp_choices") ?? null;
}
function typeAccepted(event, scale, type) {
  return presentationOperation(campProbe(event, scale, type))?.actions?.includes("type") === true;
}

export async function safariTrainerCampPresentation(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "trainer_camp") throw new Error("trainer_camp board event is required");
  await ensureSafariGeneralData();
  const scale = scalingValue(state.day);
  const base = presentationOperation(campProbe(event, scale));
  if (!base) throw new Error("trainer_camp canonical presentation is unavailable");
  const actions = [];
  for (const [partyIndex, pokemon] of (runtime.player?.party ?? []).entries()) {
    if (!usablePokemon(pokemon)) continue;
    for (const type of safariPokemonTypes(pokemon)) {
      if (!typeAccepted(event, scale, type)) continue;
      actions.push({
        id:`type:${partyIndex}:${type}`,
        label:`${pokemonLabel(pokemon)}に手伝ってもらう`,
        meta:`${type}タイプ · HP50%＋状態回復・中報酬・EXP`,
      });
    }
  }
  actions.push(
    { id:"manual", label:"自分で手伝う", meta:"HP25%回復 · 失敗しなければ小報酬" },
    { id:"buy", label:"食事だけ買う", meta:`${base.meal_price}円 · HP50%回復` },
    { id:"leave", label:"立ち去る", secondary:true },
  );
  return {
    title:"トレーナーキャンプ",
    message:`野営中のトレーナーたちが「${base.task_name}」を手伝える人を探しています。`,
    task:base.task,
    taskName:base.task_name,
    mealPrice:Number(base.meal_price),
    actions,
  };
}

export async function resolveSafariTrainerCampInteraction(runtime, index, requestedAction) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "trainer_camp") throw new Error("trainer_camp board event is required");
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", operations:[] };
  if (state.shop) return { runtime, result:"shop_active", operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", operations:[] };
  state.board_revealed[index] = true;
  state.board_visited[index] = true;

  const scale = scalingValue(state.day);
  const day = dayOf(state);
  const raw = String(requestedAction ?? "");

  if (raw.startsWith("type:")) {
    await ensureSafariGeneralData();
    const [, indexText, typeText] = raw.split(":");
    const partyIndex = Number(indexText);
    const pokemon = runtime.player?.party?.[partyIndex];
    const type = String(typeText ?? "").trim().toUpperCase();
    if (!Number.isInteger(partyIndex) || !usablePokemon(pokemon) || !safariPokemonTypes(pokemon).includes(type) || !typeAccepted(event, scale, type)) {
      return { runtime, result:"pokemon_unavailable", completed:false, operations:[], persistenceRequested:false };
    }

    const reward = sharedReward(runtime, "medium");
    if (!reward.success) {
      state.notice = "キャンプのお礼を受け取るバッグの空きがありません。バッグを空けてから手伝ってください。";
      return { runtime, result:"reward_bag_full", completed:false, operations:reward.operations ?? [], notice:state.notice, persistenceRequested:false };
    }
    const owner = resolveTrainerCamp({
      event,
      action:"type",
      suitable_type:type,
      chosen_pokemon:pokemon,
      scaling_value:scale,
      current_day:day,
      heal_result:true,
      reward_result:true,
      exp_result:true,
    });
    const expOperation = (owner.operations ?? []).find((operation) => operation?.op === "gain_small_exp");
    if (!owner.result || !expOperation) throw new Error("trainer_camp typed help canonical rewards are unresolved");

    healSafariPartyPercent(runtime, 50, { cureStatus:true });
    const applied = [
      { op:"runtime_heal_party_percent", percent:50, cure_status:true },
      ...reward.operations.map((operation) => structuredClone(operation)),
      ...applyReward(runtime, reward),
    ];
    const exp = await grantSafariNormalEventPokemonExp(runtime, partyIndex, Number(expOperation.amount));
    applied.push(...exp.operations.map((operation) => ({ ...structuredClone(operation), scope:"trainer_camp" })));
    commit(runtime, index, owner, applied);
    state.notice = `${pokemonLabel(runtime.player.party[partyIndex])}がキャンプを手伝い、手持ちが回復しました。${reward.selectedItems.join("・")}とEXP ${exp.expGained}を受け取りました。`;
    return { runtime, result:owner.outcome, completed:true, reward, exp, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  if (raw === "manual") {
    const preview = resolveTrainerCamp({ event, action:"manual", scaling_value:scale, current_day:day, heal_result:true, reward_result:true });
    const wantsReward = (preview.operations ?? []).some((operation) => operation?.op === "grant_random");
    const reward = wantsReward ? sharedReward(runtime, "small") : null;
    if (wantsReward && !reward?.success) {
      state.notice = "キャンプのお礼を受け取るバッグの空きがありません。バッグを空けてから手伝ってください。";
      return { runtime, result:"reward_bag_full", completed:false, operations:reward?.operations ?? [], notice:state.notice, persistenceRequested:false };
    }
    const owner = resolveTrainerCamp({ event, action:"manual", scaling_value:scale, current_day:day, heal_result:true, reward_result:reward?.success ?? true });
    if (!owner.result) throw new Error("trainer_camp manual canonical resolution failed");
    healSafariPartyPercent(runtime, 25, { cureStatus:false });
    const applied = [{ op:"runtime_heal_party_percent", percent:25, cure_status:false }];
    if (reward) {
      applied.push(...reward.operations.map((operation) => structuredClone(operation)));
      applied.push(...applyReward(runtime, reward));
    }
    commit(runtime, index, owner, applied);
    state.notice = owner.outcome === "manual_success"
      ? `キャンプを手伝い、手持ちが少し回復しました。${reward?.selectedItems?.join("・") ?? ""}を受け取りました。`
      : "キャンプを手伝いましたが、うまくいきませんでした。手持ちは少し回復しました。";
    return { runtime, result:owner.outcome, completed:true, reward, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  if (raw === "buy") {
    const base = presentationOperation(campProbe(event, scale));
    const price = Number(base?.meal_price ?? 0);
    const spendSuccess = Number(runtime.bag?.money ?? 0) >= price;
    const owner = resolveTrainerCamp({ event, action:"buy", scaling_value:scale, current_day:day, spend_result:spendSuccess, heal_result:true });
    if (!owner.result) {
      state.notice = `食事には${price}円必要です。`;
      return { runtime, result:owner.outcome, completed:false, mealPrice:price, operations:owner.operations ?? [], notice:state.notice, persistenceRequested:false, owner };
    }
    runtime.bag ??= { slots:[], money:0 };
    runtime.bag.money = Math.max(0, Math.trunc(Number(runtime.bag.money ?? 0)) - price);
    healSafariPartyPercent(runtime, 50, { cureStatus:false });
    commit(runtime, index, owner, [
      { op:"runtime_spend_money", amount:price },
      { op:"runtime_heal_party_percent", percent:50, cure_status:false },
    ]);
    state.notice = `${price}円で食事を買い、手持ちが50%回復しました。`;
    return { runtime, result:owner.outcome, completed:true, mealPrice:price, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  if (raw === "leave") {
    const owner = resolveTrainerCamp({ event, action:"leave", scaling_value:scale, current_day:day });
    commit(runtime, index, owner, []);
    state.notice = "トレーナーキャンプを離れました。";
    return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
  }

  const presentation = await safariTrainerCampPresentation(runtime, index);
  return { runtime, result:"unsupported_action", completed:false, availableActions:presentation.actions.map((entry) => entry.id), operations:[], persistenceRequested:false };
}
