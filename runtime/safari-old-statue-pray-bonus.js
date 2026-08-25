import {
  resolveSafariOldStatueInteraction as resolveBaseOldStatueInteraction,
  safariOldStatuePresentation as baseOldStatuePresentation,
} from "./safari-old-statue-pray-bag-safe.js";
import { resolveOldStatue } from "./mapless-old-statue-flow.js";
import {
  resolveMaplessOldStatueOutcomeV108,
  selectMaplessOldStatueBonusStatV108,
} from "./mapless-old-statue-v108-inputs.js";
import { borrowSafariSharedRunRandomInt, ensureSafariEncounterSeed } from "./safari-encounter-randomization.js";
import { addPokemonRuntimeMaplessBonusStat } from "./pokemon-runtime.js";
import { SAFARI_NATURE_MASTERS, SAFARI_SPECIES_MASTERS } from "./safari-playable-data.js";

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
function prayOutcome(event) {
  return resolveMaplessOldStatueOutcomeV108({
    normalSeed:Number(event.normal_seed),
    roll:Number(event.normal_data?.pray_roll ?? 0),
    goodLimit:50,
    neutralLimit:80,
  });
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
function pending(runtime, result, notice) {
  const state = stateOf(runtime);
  state.notice = notice;
  return { runtime, result, completed:false, operations:[], notice, persistenceRequested:false };
}
function applyPermanentBonus(runtime, partyIndex, stat, amount = 1) {
  const pokemon = partyCandidate(runtime, partyIndex);
  if (!pokemon) return { success:false, reason:"no_selection", operations:[] };
  const speciesMaster = SAFARI_SPECIES_MASTERS[pokemon.species];
  if (!speciesMaster) throw new RangeError(`species is outside the Safari projection: ${pokemon.species}`);
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

export function safariOldStatueBonusCandidates(runtime) {
  return (runtime?.player?.party ?? []).flatMap((pokemon, index) => pokemon && !isEgg(pokemon)
    ? [{ index, species:pokemon.species, fainted:Number(pokemon.hp ?? 0) <= 0 }]
    : []);
}

export function safariOldStatuePrayNeedsPokemon(runtime, index) {
  const resolved = prayOutcome(eventAt(runtime, index));
  return resolved.branch === "good" && resolved.effectIndex === 1;
}

export function safariOldStatuePresentation(runtime, index) {
  const presentation = baseOldStatuePresentation(runtime, index);
  return {
    ...presentation,
    actions:presentation.actions.map((action) => action.id === "pray"
      ? { ...action, meta:"回復・個体ボーナス・道具・お金・災いなどを接続済み" }
      : action),
  };
}

export async function resolveSafariOldStatueInteraction(runtime, index, requestedAction, options = {}) {
  const action = String(requestedAction ?? "");
  if (action !== "pray") return await resolveBaseOldStatueInteraction(runtime, index, action);

  const state = stateOf(runtime);
  const event = eventAt(runtime, index);
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", completed:false, operations:[] };
  if (state.shop) return { runtime, result:"shop_active", completed:false, operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", completed:true, operations:[] };

  const resolved = prayOutcome(event);
  if (!(resolved.branch === "good" && resolved.effectIndex === 1)) {
    return await resolveBaseOldStatueInteraction(runtime, index, action);
  }

  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  const partyIndex = Number(options.pokemonIndex);
  const selected = partyCandidate(runtime, partyIndex);
  if (!selected) {
    return pending(runtime, "old_statue_bonus_selection_cancelled", "石像の加護を受けるポケモンを選んでください。イベントも共有RNGも消費していません。");
  }

  ensureSafariEncounterSeed(state);
  const statSelection = selectMaplessOldStatueBonusStatV108((max) => borrowSafariSharedRunRandomInt(runtime, max));
  if (!statSelection?.value) return pending(runtime, "old_statue_bonus_stat_selection_failed", "石像の加護の能力抽選に失敗しました。イベントは消費していません。");

  const bonus = applyPermanentBonus(runtime, partyIndex, statSelection.value, 1);
  if (!bonus.success) return pending(runtime, "old_statue_bonus_apply_failed", "石像の加護を反映できませんでした。イベントは消費していません。");

  const outcome = { effect_index:resolved.effectIndex, status:resolved.status };
  const owner = resolveOldStatue({
    event,
    choice:"pray",
    outcome,
    selected_pokemon:{ party_index:partyIndex, species:selected.species },
    grant_result:true,
  });
  const applied = [
    { op:"select_old_statue_bonus_stat", stat:statSelection.value, index:statSelection.index },
    ...bonus.operations,
  ];
  commit(runtime, index, owner, applied);
  state.notice = `${selected.species}の${statSelection.value}ボーナスが1上がりました。`;
  return { runtime, result:owner.outcome, completed:true, bonus, stat:statSelection.value, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
}
