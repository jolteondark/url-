import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { commitSafariBagEconomyReceipt } from "./safari-bag-economy-receipt.js";
import { borrowSafariSharedRunRandomInt, ensureSafariEncounterSeed } from "./safari-encounter-randomization.js";
import { resolveCanonicalEvolutionLabV108 } from "./mapless-evolution-lab-v108.js";

const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function evolutionLabEvent(runtime, index) {
  const event = stateOf(runtime).board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "evolution_lab") {
    throw new Error("evolution_lab board event is required");
  }
  return event;
}

function requestsSave(operations = []) {
  return operations.some((operation) => operation?.op === "request_save");
}

function commitTerminalOwner(runtime, index, owner, applied = [], reason = "evolution_lab_resolved") {
  const state = stateOf(runtime);
  state.board_events[index] = owner.event;
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  state.board_consumed[index] = Boolean(owner.event?.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? []).filter((operation) => operation?.op !== "grant_item").map((operation) => structuredClone(operation)),
    ...applied.map((operation) => structuredClone(operation)),
    { op:"request_save", reason },
  ];
  return state;
}

function preflightSingleItem(runtime, item) {
  const slots = runtime?.bag?.slots ?? [];
  const maxSlots = Number(runtime?.bag?.max_slots ?? runtime?.bag?.maxSlots ?? SAFARI_BAG_MAX_SLOTS);
  const maxPerSlot = Number(runtime?.bag?.max_per_slot ?? runtime?.bag?.maxPerSlot ?? SAFARI_BAG_MAX_PER_SLOT);
  return resolveRewardTransaction({
    pockets:{ general:{ slots, maxSlots, maxPerSlot } },
    itemMeta:{ [item]:{ valid:true, pocket:"general" } },
    items:[item],
  });
}

export function safariEvolutionLabPresentation(runtime, index) {
  evolutionLabEvent(runtime, index);
  return {
    title:"進化研究所",
    message:"進化装置があります。部品回収と離脱は利用できます。安定出力／最大出力はPokémon Runtimeの進化commit接続待ちです。",
    actions:[
      { id:"stable", label:"安定出力", disabled:true },
      { id:"maximum", label:"最大出力", disabled:true },
      { id:"parts", label:"部品を回収する" },
      { id:"leave", label:"立ち去る", secondary:true },
    ],
  };
}

export function resolveSafariEvolutionLabInteraction(runtime, index, action) {
  const state = stateOf(runtime);
  const event = evolutionLabEvent(runtime, index);
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", completed:false, operations:[] };
  if (state.shop) return { runtime, result:"shop_active", completed:false, operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", completed:true, operations:[] };

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const choice = String(action ?? "");
  if (choice === "stable" || choice === "maximum") {
    state.notice = "進化処理はPokémon Runtimeのauthoritative mutation接続待ちです。";
    return {
      runtime,
      result:"pokemon_mutation_owner_unavailable",
      completed:false,
      operations:[],
      persistenceRequested:false,
      notice:state.notice,
    };
  }
  if (choice !== "parts" && choice !== "leave") {
    return { runtime, result:"unsupported_action", completed:false, operations:[], persistenceRequested:false };
  }

  if (choice === "leave") {
    const owner = resolveCanonicalEvolutionLabV108({ event, choice:"leave" });
    commitTerminalOwner(runtime, index, owner, [], "evolution_lab_left");
    state.notice = "進化研究所を立ち去りました。";
    return {
      runtime,
      result:owner.outcome,
      completed:true,
      terminal:true,
      operations:state.last_operations,
      persistenceRequested:requestsSave(state.last_operations),
      notice:state.notice,
      owner,
    };
  }

  ensureSafariEncounterSeed(state);
  const counter = state.preview_encounter_counter;
  const owner = resolveCanonicalEvolutionLabV108({
    event,
    choice:"parts",
    random_int:(limit) => borrowSafariSharedRunRandomInt(runtime, limit),
  });
  const grant = (owner.operations ?? []).find((operation) => operation?.op === "grant_item");
  if (!grant?.item) {
    commitTerminalOwner(runtime, index, owner, [], "evolution_lab_parts_empty");
    state.notice = "回収できる部品はありませんでした。";
    return {
      runtime,
      result:owner.outcome,
      completed:true,
      terminal:true,
      operations:state.last_operations,
      persistenceRequested:requestsSave(state.last_operations),
      notice:state.notice,
      owner,
    };
  }

  const reward = preflightSingleItem(runtime, grant.item);
  if (!reward.success) {
    state.preview_encounter_counter = counter;
    state.notice = "バッグに空きがないため、部品を回収しませんでした。";
    return {
      runtime,
      result:reward.result,
      completed:false,
      terminal:false,
      reward,
      operations:(reward.operations ?? []).map((operation) => structuredClone(operation)),
      persistenceRequested:false,
      notice:state.notice,
      owner,
    };
  }
  const receipt = commitSafariBagEconomyReceipt(runtime, { reward });
  if (!receipt.success) {
    state.preview_encounter_counter = counter;
    state.notice = "バッグに部品を追加できませんでした。";
    return {
      runtime,
      result:receipt.result,
      completed:false,
      terminal:false,
      operations:(receipt.operations ?? []).map((operation) => structuredClone(operation)),
      persistenceRequested:false,
      notice:state.notice,
      owner,
    };
  }
  commitTerminalOwner(runtime, index, owner, receipt.operations ?? [], "evolution_lab_parts_recovered");
  state.notice = `${grant.item}を回収しました。`;
  return {
    runtime,
    result:owner.outcome,
    completed:true,
    terminal:true,
    rewardItem:grant.item,
    operations:state.last_operations,
    persistenceRequested:requestsSave(state.last_operations),
    notice:state.notice,
    owner,
  };
}

export function interactiveSafariEvolutionLab(runtime, index) {
  const state = stateOf(runtime);
  const ui = safariEvolutionLabPresentation(runtime, index);
  state.notice = ui.message;
  globalThis.__maplessNormalEventUi = {
    runtime,
    boardIndex:index,
    eventId:"evolution_lab",
    ...ui,
  };
  if (typeof globalThis.dispatchEvent === "function" && typeof globalThis.CustomEvent === "function") {
    globalThis.dispatchEvent(new CustomEvent("safari-normal-event-ui"));
  }
  const confirmFn = typeof globalThis.confirm === "function" ? globalThis.confirm.bind(globalThis) : null;
  if (!confirmFn) {
    return {
      runtime,
      result:"evolution_lab_ready",
      boundary:"normal_event",
      notice:state.notice,
      availableActions:ui.actions.map((entry) => entry.id),
      operations:[],
    };
  }
  const recover = confirmFn(`${ui.message}\n\n部品を回収しますか？`);
  return resolveSafariEvolutionLabInteraction(runtime, index, recover ? "parts" : "leave");
}
