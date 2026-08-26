import {
  resolveSafariOldStatueInteraction as resolveBaseOldStatueInteraction,
  safariOldStatueBonusCandidates,
  safariOldStatueOfferEntries,
  safariOldStatuePrayNeedsPokemon,
  safariOldStatuePresentation as baseOldStatuePresentation,
} from "./safari-old-statue-offer-low-item.js?v=20260826-1825";
import { resolveOldStatue } from "./mapless-old-statue-flow.js";
import {
  resolveMaplessOldStatueOutcomeV108,
  selectMaplessOldStatueBonusStatV108,
} from "./mapless-old-statue-v108-inputs.js";
import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { borrowSafariSharedRunRandomInt, ensureSafariEncounterSeed } from "./safari-encounter-randomization.js";
import { addPokemonRuntimeMaplessBonusStat } from "./pokemon-runtime.js";
import { SAFARI_NATURE_MASTERS, SAFARI_SPECIES_MASTERS } from "./safari-playable-data.js";

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
function isEgg(pokemon) { return Number(pokemon?.steps_to_hatch ?? 0) > 0; }
function partyCandidate(runtime, index) {
  if (!Number.isInteger(index) || index < 0) return null;
  const pokemon = runtime?.player?.party?.[index];
  return pokemon && !isEgg(pokemon) ? pokemon : null;
}
function pockets(runtime) {
  return { general:{ slots:runtime?.bag?.slots ?? [], maxSlots:SAFARI_BAG_MAX_SLOTS, maxPerSlot:SAFARI_BAG_MAX_PER_SLOT } };
}
function itemMeta(itemId) {
  return { [itemId]:{ valid:true, pocket:"general" } };
}
function offerOutcome(event) {
  return resolveMaplessOldStatueOutcomeV108({
    normalSeed:Number(event.normal_seed),
    roll:Number(event.normal_data?.offer_roll ?? 0),
    goodLimit:75,
    neutralLimit:95,
  });
}
function pending(runtime, result, notice) {
  const state = stateOf(runtime);
  state.notice = notice;
  return { runtime, result, completed:false, operations:[], notice, persistenceRequested:false };
}
function beginSharedDraw(runtime) {
  const state = stateOf(runtime);
  ensureSafariEncounterSeed(state);
  return Number(state.preview_encounter_counter ?? 0);
}
function rollbackSharedDraw(runtime, counter) {
  stateOf(runtime).preview_encounter_counter = counter;
}
function applyCost(runtime, transaction) {
  runtime.bag ??= { slots:[], money:0 };
  runtime.bag.slots = transaction.pockets.general.slots.filter(Boolean);
  return (transaction.consumed ?? []).map((entry) => ({ op:"runtime_remove_item", item:entry.item, quantity:entry.quantity }));
}
function applyPermanentBonus(runtime, partyIndex, stat, amount = 1) {
  const pokemon = partyCandidate(runtime, partyIndex);
  if (!pokemon) return { success:false, reason:"no_selection", operations:[] };
  const speciesMaster = SAFARI_SPECIES_MASTERS[pokemon.species];
  if (!speciesMaster) return { success:false, reason:"unknown_species", operations:[] };
  const natureId = pokemon.nature_for_stats_id ?? pokemon.nature_id ?? null;
  const natureMaster = natureId ? SAFARI_NATURE_MASTERS[natureId] : null;
  const before = structuredClone(pokemon.mapless_bonus_stats ?? {});
  const next = addPokemonRuntimeMaplessBonusStat(pokemon, stat, amount, {
    base_stats:speciesMaster.base_stats,
    nature_stat_changes:natureMaster?.stat_changes ?? [],
  });
  runtime.player.party[partyIndex] = next;
  return {
    success:true,
    pokemon:next,
    operations:[{ op:"runtime_add_mapless_bonus_stat", party_index:partyIndex, species:next.species, stat, amount, before, after:structuredClone(next.mapless_bonus_stats ?? {}) }],
  };
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

export { safariOldStatueBonusCandidates, safariOldStatueOfferEntries, safariOldStatuePrayNeedsPokemon };

export function safariOldStatueOfferNeedsPokemon(runtime, index) {
  const resolved = offerOutcome(eventAt(runtime, index));
  return resolved.branch === "good" && resolved.effectIndex === 1;
}

export function safariOldStatuePresentation(runtime, index) {
  const presentation = baseOldStatuePresentation(runtime, index);
  return {
    ...presentation,
    actions:presentation.actions.map((action) => action.id === "offer"
      ? { ...action, meta:"供物の全canonical反応をSafariへ接続済み" }
      : action),
  };
}

export async function resolveSafariOldStatueInteraction(runtime, index, requestedAction, options = {}) {
  const action = String(requestedAction ?? "");
  if (action !== "offer") return await resolveBaseOldStatueInteraction(runtime, index, action, options);

  const state = stateOf(runtime);
  const event = eventAt(runtime, index);
  const resolved = offerOutcome(event);
  if (!(resolved.branch === "good" && resolved.effectIndex === 1)) {
    return await resolveBaseOldStatueInteraction(runtime, index, action, options);
  }
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", completed:false, operations:[] };
  if (state.shop) return { runtime, result:"shop_active", completed:false, operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", completed:true, operations:[] };

  const offeredItem = String(options?.offeredItem ?? "");
  if (!offeredItem) return pending(runtime, "old_statue_offer_cancelled", "供える道具を選びませんでした。道具もイベントも消費していません。");
  if (!safariOldStatueOfferEntries(runtime, index).some((entry) => entry.id === offeredItem)) {
    return pending(runtime, "old_statue_offer_item_ineligible", "その道具は石像への供物にできません。道具もイベントも消費していません。");
  }

  const partyIndex = Number(options?.pokemonIndex);
  const selected = partyCandidate(runtime, partyIndex);
  if (!selected) {
    return pending(runtime, "old_statue_offer_bonus_selection_cancelled", "石像の加護を受けるポケモンを選んでください。供物・イベント・共有RNGは消費していません。");
  }

  const transaction = resolveRewardTransaction({
    pockets:pockets(runtime),
    itemMeta:itemMeta(offeredItem),
    costs:[{ item:offeredItem, quantity:1 }],
  });
  if (!transaction.success) {
    return pending(runtime, "old_statue_offer_remove_failed", "供物を安全に消費できませんでした。道具もイベントも消費していません。");
  }

  const counter = beginSharedDraw(runtime);
  const statSelection = selectMaplessOldStatueBonusStatV108((max) => borrowSafariSharedRunRandomInt(runtime, max));
  if (!statSelection?.value) {
    rollbackSharedDraw(runtime, counter);
    return pending(runtime, "old_statue_offer_bonus_stat_selection_failed", "石像の加護の能力抽選に失敗しました。供物・イベント・共有RNGは消費していません。");
  }

  const owner = resolveOldStatue({
    event,
    choice:"offer",
    offered_item:offeredItem,
    remove_result:true,
    outcome:{ effect_index:resolved.effectIndex, status:resolved.status },
    selected_pokemon:{ party_index:partyIndex, species:selected.species },
    grant_result:true,
  });
  const bonus = applyPermanentBonus(runtime, partyIndex, statSelection.value, 1);
  if (!bonus.success) {
    rollbackSharedDraw(runtime, counter);
    return pending(runtime, "old_statue_offer_bonus_apply_failed", "石像の加護を反映できませんでした。供物・イベント・共有RNGは消費していません。");
  }

  const applied = [
    ...(transaction.operations ?? []).map((operation) => structuredClone(operation)),
    ...applyCost(runtime, transaction),
    { op:"select_old_statue_bonus_stat", stat:statSelection.value, index:statSelection.index },
    ...bonus.operations,
  ];
  commit(runtime, index, owner, applied);
  state.notice = `${offeredItem}を供え、${selected.species}の${statSelection.value}ボーナスが1上がりました。`;
  return {
    runtime,
    result:owner.outcome,
    completed:true,
    offeredItem,
    bonus,
    stat:statSelection.value,
    transaction,
    owner,
    operations:state.last_operations,
    notice:state.notice,
    persistenceRequested:true,
  };
}
