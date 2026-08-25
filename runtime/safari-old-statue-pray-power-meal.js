import {
  resolveSafariOldStatueInteraction as resolveBaseOldStatueInteraction,
  safariOldStatueBonusCandidates,
  safariOldStatuePrayNeedsPokemon,
  safariOldStatuePresentation as baseOldStatuePresentation,
} from "./safari-old-statue-pray-bonus.js";
import { resolveOldStatue } from "./mapless-old-statue-flow.js";
import { resolveMaplessOldStatueOutcomeV108 } from "./mapless-old-statue-v108-inputs.js";
import { setSafariPowerMeal } from "./mapless-power-meal-runtime.js";

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

export { safariOldStatueBonusCandidates, safariOldStatuePrayNeedsPokemon };

export function safariOldStatuePresentation(runtime, index) {
  const presentation = baseOldStatuePresentation(runtime, index);
  return {
    ...presentation,
    actions:presentation.actions.map((action) => action.id === "pray"
      ? { ...action, meta:"回復・個体ボーナス・道具・お金・一戦の力・災いなどを接続済み" }
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
  if (!(resolved.branch === "good" && resolved.effectIndex === 5)) {
    return await resolveBaseOldStatueInteraction(runtime, index, action, options);
  }

  const meal = setSafariPowerMeal(runtime, 1);
  const owner = resolveOldStatue({
    event,
    choice:"pray",
    outcome:{ effect_index:resolved.effectIndex, status:resolved.status },
  });
  const applied = [{ op:"runtime_set_power_meal", battles:meal.battles, day:meal.day, source:"old_statue" }];
  commit(runtime, index, owner, applied);
  state.notice = "石像の力が宿りました。次の1戦で攻撃と特攻が上がります。";
  return {
    runtime,
    result:owner.outcome,
    completed:true,
    powerMeal:meal,
    operations:state.last_operations,
    notice:state.notice,
    persistenceRequested:true,
    owner,
  };
}
