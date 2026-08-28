export * from "./safari-old-statue-offer-continuation.js?v=20260828-2300";

import {
  resolveSafariOldStatueInteraction as resolveBaseOldStatueInteraction,
  safariOldStatuePresentation as baseOldStatuePresentation,
} from "./safari-old-statue-offer-continuation.js?v=20260828-2300";
import { resolveOldStatue } from "./mapless-old-statue-flow.js";
import { damageSafariPokemonPercent } from "./safari-pokemon-healing.js";
import { activateSafariNormalEventWildBattle } from "./safari-web-combat-start.js";

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
function isEgg(pokemon) { return Number(pokemon?.steps_to_hatch ?? 0) > 0 || pokemon?.egg === true; }
function battleOperation(owner) { return (owner.operations ?? []).find((operation) => operation?.op === "start_wild_battle") ?? null; }
function applyCollapseDamage(runtime, percent) {
  runtime.player ??= { party:[] };
  const applied = [];
  runtime.player.party = (runtime.player.party ?? []).map((pokemon, index) => {
    if (!pokemon || isEgg(pokemon) || Number(pokemon.hp ?? 0) <= 0) return pokemon;
    applied.push({ op:"runtime_damage_pokemon_percent", party_index:index, percent:Number(percent) });
    return damageSafariPokemonPercent(pokemon, percent);
  });
  return applied;
}
function commit(runtime, index, owner, applied) {
  const state = stateOf(runtime);
  state.board_events[index] = owner.event;
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [
    ...(owner.operations ?? []).filter((operation) => operation?.op !== "damage_party").map((operation) => structuredClone(operation)),
    ...applied,
    { op:"request_save", reason:"old_statue_break_collapse" },
  ];
  return state;
}

export function safariOldStatuePresentation(runtime, index) {
  const presentation = baseOldStatuePresentation(runtime, index);
  return {
    ...presentation,
    actions:presentation.actions.map((action) => action.id === "break"
      ? { ...action, meta:"石像を壊します。守護者Battleと崩落ダメージはSafari接続済み" }
      : action),
  };
}

export async function resolveSafariOldStatueInteraction(runtime, index, requestedAction, options = {}) {
  const action = String(requestedAction ?? "");
  if (action !== "break") return await resolveBaseOldStatueInteraction(runtime, index, action, options);

  const state = stateOf(runtime);
  const event = eventAt(runtime, index);
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", completed:false, operations:[] };
  if (state.shop) return { runtime, result:"shop_active", completed:false, operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", completed:true, operations:[] };

  const roll = Number(event.normal_data?.break_roll ?? 0);
  if (roll < 50) {
    const preview = resolveOldStatue({ event, choice:"break", battle_success:false });
    const battleEvent = battleOperation(preview);
    if (!battleEvent) throw new Error("old_statue break guardian route requires canonical Battle request");
    const started = await activateSafariNormalEventWildBattle(runtime, index, {
      eventId:"old_statue",
      actionId:"break",
      battleEvent,
      request:structuredClone(battleEvent),
      payload:{ guardian_type:"ROCK", cannot_run:true },
    });
    if (started.result === "normal_event_wild_battle_started" && state.battle) globalThis.__maplessNormalEventUi = null;
    return started;
  }
  if (roll < 95) return await resolveBaseOldStatueInteraction(runtime, index, action, options);

  const owner = resolveOldStatue({ event, choice:"break" });
  const damage = applyCollapseDamage(runtime, 15);
  commit(runtime, index, owner, damage);
  state.notice = "石像が崩れ、手持ちのポケモンが最大HPの15%ぶん傷つきました。";
  return {
    runtime,
    result:owner.outcome,
    completed:true,
    owner,
    operations:state.last_operations,
    notice:state.notice,
    persistenceRequested:true,
  };
}
