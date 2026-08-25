import {
  resolveSafariOldStatueInteraction as resolveBaseOldStatueInteraction,
  safariOldStatueBonusCandidates,
  safariOldStatuePrayNeedsPokemon,
  safariOldStatuePresentation as baseOldStatuePresentation,
} from "./safari-old-statue-pray-power-meal.js";
import { resolveOldStatue } from "./mapless-old-statue-flow.js";
import {
  resolveMaplessOldStatueOutcomeV108,
  selectMaplessOldStatueBattleTypeV108,
} from "./mapless-old-statue-v108-inputs.js";
import { borrowSafariSharedRunRandomInt, ensureSafariEncounterSeed } from "./safari-encounter-randomization.js";
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
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "old_statue") throw new Error("old_statue board event is required");
  return event;
}
function prayOutcome(event) {
  return resolveMaplessOldStatueOutcomeV108({
    normalSeed:Number(event.normal_seed),
    roll:Number(event.normal_data?.pray_roll ?? 0),
    goodLimit:50,
    neutralLimit:80,
  });
}
function battleOperation(owner) {
  return (owner.operations ?? []).find((operation) => operation?.op === "start_wild_battle") ?? null;
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

registerSafariNormalEventBattleContinuation("old_statue", (runtime, continuation) => {
  if (continuation.actionId !== "pray") throw new Error("old_statue continuation only owns pray Battle here");
  const index = Number(continuation.boardIndex);
  const event = eventAt(runtime, index);
  const resolved = prayOutcome(event);
  if (!(resolved.branch === "neutral" && resolved.effectIndex === 0)) throw new Error("old_statue pray continuation requires neutral Battle outcome");
  const type = String(continuation.payload?.battle_type ?? "");
  const owner = resolveOldStatue({
    event,
    choice:"pray",
    scaling_value:maplessNormalEventScalingValue(stateOf(runtime).day),
    outcome:{ effect_index:resolved.effectIndex, status:resolved.status, type_id:type },
  });
  const state = commit(runtime, index, owner, [{ op:"runtime_normal_event_battle_return", type, decision:Number(continuation.battleReturn?.decision ?? 0) }]);
  state.notice = "石像から現れたポケモンとの戦いを終えました。";
  return { runtime, result:owner.outcome, completed:true, terminal:true, operations:state.last_operations, notice:state.notice, persistenceRequested:true, owner };
});

export { safariOldStatueBonusCandidates, safariOldStatuePrayNeedsPokemon };

export function safariOldStatuePresentation(runtime, index) {
  const presentation = baseOldStatuePresentation(runtime, index);
  return {
    ...presentation,
    actions:presentation.actions.map((action) => action.id === "pray"
      ? { ...action, meta:"回復・個体ボーナス・道具・お金・一戦の力・野生戦・災いなどを接続済み" }
      : action),
  };
}

export async function resolveSafariOldStatueInteraction(runtime, index, requestedAction, options = {}) {
  const action = String(requestedAction ?? "");
  if (action !== "pray") return await resolveBaseOldStatueInteraction(runtime, index, action, options);

  const state = stateOf(runtime);
  const event = eventAt(runtime, index);
  if (state.battle && !state.battle.completed) return { runtime, result:"battle_active", completed:false, operations:[] };
  if (state.shop) return { runtime, result:"shop_active", completed:false, operations:[] };
  if (state.board_consumed?.[index]) return { runtime, result:"already_consumed", completed:true, operations:[] };

  const resolved = prayOutcome(event);
  if (!(resolved.branch === "neutral" && resolved.effectIndex === 0)) {
    return await resolveBaseOldStatueInteraction(runtime, index, action, options);
  }

  ensureSafariEncounterSeed(state);
  const counter = Number(state.preview_encounter_counter ?? 0);
  const selected = selectMaplessOldStatueBattleTypeV108((max) => borrowSafariSharedRunRandomInt(runtime, max));
  if (!selected?.value) {
    state.preview_encounter_counter = counter;
    state.notice = "石像の戦闘タイプ抽選に失敗しました。イベントと共有RNGは消費していません。";
    return { runtime, result:"old_statue_battle_type_selection_failed", completed:false, operations:[], notice:state.notice, persistenceRequested:false };
  }

  const preview = resolveOldStatue({
    event,
    choice:"pray",
    scaling_value:maplessNormalEventScalingValue(state.day),
    outcome:{ effect_index:resolved.effectIndex, status:resolved.status, type_id:selected.value },
  });
  const battleEvent = battleOperation(preview);
  if (!battleEvent) {
    state.preview_encounter_counter = counter;
    throw new Error("old_statue pray did not request Battle");
  }
  const started = await activateSafariNormalEventWildBattle(runtime, index, {
    eventId:"old_statue",
    actionId:"pray",
    battleEvent,
    request:structuredClone(battleEvent),
    payload:{ battle_type:selected.value },
  });
  if (started.result !== "normal_event_wild_battle_started") {
    state.preview_encounter_counter = counter;
    return started;
  }
  if (state.battle) globalThis.__maplessNormalEventUi = null;
  const operations = [
    { op:"select_old_statue_battle_type", type:selected.value, index:selected.index },
    ...(started.operations ?? []),
    { op:"request_save", reason:"old_statue_battle_started" },
  ];
  state.last_operations = operations;
  return { ...started, operations, persistenceRequested:true, battleType:selected.value };
}
