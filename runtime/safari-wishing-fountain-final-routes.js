import {
  resolveSafariWishingFountainInteraction as resolveBaseWishingFountainInteraction,
  safariWishingFountainPresentation as baseWishingFountainPresentation,
} from "./safari-wishing-fountain-interaction.js";
import { resolveWishingFountain } from "./mapless-wishing-fountain-flow.js";
import {
  resolveMaplessWishingFountainReachBattleTypeV108,
  resolveMaplessWishingFountainReachStatusV108,
} from "./mapless-wishing-fountain-reach-v108.js";
import { addPokemonRuntimeMaplessBonusStat, updatePokemonRuntime } from "./pokemon-runtime.js";
import { SAFARI_NATURE_MASTERS, SAFARI_SPECIES_MASTERS } from "./safari-playable-data.js";
import { registerSafariNormalEventBattleContinuation } from "./safari-normal-event-battle-continuation.js";
import { activateSafariNormalEventWildBattle } from "./safari-web-combat-start.js";
import { maplessNormalEventScalingValue } from "./mapless-normal-event-medium-reward.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function eventAt(runtime, index) {
  const event = stateOf(runtime).board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "wishing_fountain") throw new Error("wishing_fountain board event is required");
  return event;
}
function scalingValue(runtime) { return maplessNormalEventScalingValue(stateOf(runtime).day); }
function commit(runtime, index, owner, applied = []) {
  const state = stateOf(runtime);
  state.board_events[index] = owner.event;
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? []).map((operation) => structuredClone(operation)),
    ...applied,
    { op:"request_save", reason:"wishing_fountain_resolved" },
  ];
  return state;
}
function isEgg(pokemon) { return Number(pokemon?.steps_to_hatch ?? 0) > 0; }
function isFainted(pokemon) { return Number(pokemon?.hp ?? 0) <= 0; }
function partyCandidate(runtime, index) {
  if (!Number.isInteger(index) || index < 0) return null;
  const pokemon = runtime?.player?.party?.[index];
  return pokemon && !isEgg(pokemon) ? pokemon : null;
}
function activePartyLead(runtime) {
  return (runtime?.player?.party ?? []).find((pokemon) => pokemon && !isEgg(pokemon) && !isFainted(pokemon)) ?? null;
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
    base_stats: speciesMaster.base_stats,
    nature_stat_changes: natureMaster?.stat_changes ?? [],
  });
  runtime.player.party[partyIndex] = next;
  return {
    success:true,
    pokemon:next,
    operations:[{ op:"runtime_add_mapless_bonus_stat", party_index:partyIndex, species:next.species, stat, amount, before, after:structuredClone(next.mapless_bonus_stats ?? {}) }],
  };
}
function applyReachStatus(runtime, status) {
  const pokemon = activePartyLead(runtime);
  if (!pokemon) return { success:false, reason:"no_active_party", operations:[] };
  const current = pokemon.status == null ? "NONE" : String(pokemon.status);
  if (current !== "NONE") return { success:false, reason:"already_statused", pokemon, operations:[] };
  const index = runtime.player.party.indexOf(pokemon);
  const next = updatePokemonRuntime(pokemon, { status, status_count:0 });
  runtime.player.party[index] = next;
  return { success:true, pokemon:next, operations:[{ op:"runtime_inflict_status", target:"active_party_0", party_index:index, status }] };
}
function battleSucceeded(summary={}) {
  const decision = Number(summary.decision);
  return decision === 1 || decision === 4;
}
function battleOperation(owner) {
  return (owner.operations ?? []).find((operation) => operation?.op === "start_wild_battle") ?? null;
}

registerSafariNormalEventBattleContinuation("wishing_fountain", (runtime, continuation) => {
  if (continuation.actionId !== "reach") throw new Error("wishing_fountain continuation only owns reach Battle");
  const index = Number(continuation.boardIndex);
  const event = eventAt(runtime, index);
  const type = String(continuation.payload?.reach_battle_type ?? "");
  const owner = resolveWishingFountain({
    event,
    action:"reach",
    scaling_value:scalingValue(runtime),
    reach_battle_type:type,
    battle_result:Number(continuation.battleReturn?.decision ?? 0),
  });
  const state = commit(runtime, index, owner, [{ op:"runtime_normal_event_battle_return", success:battleSucceeded(continuation.battleReturn), type }]);
  state.notice = battleSucceeded(continuation.battleReturn)
    ? "泉から現れたポケモンとの戦いを終え、泉を離れました。"
    : "泉での戦いは終わりました。";
  return { runtime, result:owner.outcome, completed:true, terminal:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
});

export function safariWishingFountainBonusCandidates(runtime) {
  return (runtime?.player?.party ?? []).flatMap((pokemon, index) => pokemon && !isEgg(pokemon)
    ? [{ index, species:pokemon.species, fainted:isFainted(pokemon) }]
    : []);
}

export function safariWishingFountainPresentation(runtime, index) {
  const presentation = baseWishingFountainPresentation(runtime, index);
  return {
    ...presentation,
    actions:presentation.actions.map((action) => action.id === "large_wish"
      ? { ...action, meta:"大きな道具・個体ボーナス・全回復・何もなし、のいずれか" }
      : action.id === "reach"
        ? { ...action, meta:"お金・戦闘・状態異常・大きな道具、のいずれか" }
        : action),
  };
}

export async function resolveSafariWishingFountainInteraction(runtime, index, requestedAction, options = {}) {
  const state = stateOf(runtime);
  const event = eventAt(runtime, index);
  const action = String(requestedAction ?? "");

  if (action === "large_wish") {
    const roll = Number(event.normal_data?.large_roll ?? 0);
    if (roll >= 45 && roll < 65) {
      const scale = scalingValue(runtime);
      const price = 1200 + scale * 200;
      const money = Math.max(0, Math.trunc(Number(runtime.bag?.money ?? 0)));
      if (money < price) return resolveBaseWishingFountainInteraction(runtime, index, action);
      const partyIndex = Number(options.pokemonIndex);
      const selected = partyCandidate(runtime, partyIndex);
      const owner = resolveWishingFountain({
        event,
        action:"large_wish",
        scaling_value:scale,
        spend_result:true,
        chosen_pokemon:selected ? { party_index:partyIndex, species:selected.species } : null,
        bonus_result:true,
      });
      runtime.bag ??= { slots:[], money:0 };
      runtime.bag.money = money - price;
      const applied = [{ op:"runtime_spend_money", amount:price }];
      let bonus = null;
      if (selected) {
        bonus = applyPermanentBonus(runtime, partyIndex, event.normal_data?.bonus_stat, 1);
        applied.push(...bonus.operations);
      }
      commit(runtime, index, owner, applied);
      state.notice = selected && bonus?.success
        ? `${price}円を捧げると、${selected.species}の${event.normal_data?.bonus_stat}ボーナスが1上がりました。`
        : `${price}円を捧げましたが、強化するポケモンを選ばず泉を離れました。`;
      return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner, bonus };
    }
  }

  if (action === "reach") {
    const roll = Number(event.normal_data?.reach_roll ?? 0);
    if (roll >= 40 && roll < 70) {
      const type = resolveMaplessWishingFountainReachBattleTypeV108(event.normal_seed);
      const preview = resolveWishingFountain({ event, action:"reach", scaling_value:scalingValue(runtime), reach_battle_type:type, battle_result:null });
      const battleEvent = battleOperation(preview);
      if (!battleEvent) throw new Error("wishing_fountain reach did not request Battle");
      const started = await activateSafariNormalEventWildBattle(runtime, index, {
        eventId:"wishing_fountain",
        actionId:"reach",
        battleEvent,
        request:structuredClone(battleEvent),
        payload:{ reach_battle_type:type },
      });
      if (started.result === "normal_event_wild_battle_started" && state.battle) globalThis.__maplessNormalEventUi = null;
      const operations = [...(started.operations ?? []), { op:"request_save", reason:"wishing_fountain_battle_started" }];
      state.last_operations = operations;
      return { ...started, operations, persistenceRequested:true };
    }
    if (roll >= 70 && roll < 90) {
      const status = resolveMaplessWishingFountainReachStatusV108(event.normal_seed);
      const appliedStatus = applyReachStatus(runtime, status);
      const owner = resolveWishingFountain({
        event,
        action:"reach",
        scaling_value:scalingValue(runtime),
        reach_status:status,
        status_result:appliedStatus.success,
      });
      commit(runtime, index, owner, appliedStatus.operations);
      state.notice = appliedStatus.success
        ? `泉の冷気で先頭のポケモンが${status}になりました。`
        : "泉の冷気がまとわりつきましたが、状態異常は変化しませんでした。";
      return { runtime, result:owner.outcome, completed:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner, status, statusApplied:appliedStatus.success };
    }
  }

  return await resolveBaseWishingFountainInteraction(runtime, index, action);
}
