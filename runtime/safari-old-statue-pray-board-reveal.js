import {
  resolveSafariOldStatueInteraction as resolveBaseOldStatueInteraction,
  safariOldStatueBonusCandidates,
  safariOldStatuePrayNeedsPokemon,
  safariOldStatuePresentation as baseOldStatuePresentation,
} from "./safari-old-statue-pray-battle.js";
import { resolveOldStatue } from "./mapless-old-statue-flow.js";
import { resolveMaplessOldStatueOutcomeV108 } from "./mapless-old-statue-v108-inputs.js";
import { borrowSafariSharedRunRandomInt, ensureSafariEncounterSeed } from "./safari-encounter-randomization.js";

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

function eligibleRevealIndices(state, currentIndex) {
  const events = Array.isArray(state.board_events) ? state.board_events : [];
  return events.flatMap((event, index) => {
    if (index === currentIndex || !event) return [];
    if (state.board_revealed?.[index] || state.board_consumed?.[index]) return [];
    return [index];
  });
}

function pending(runtime, result, notice) {
  const state = stateOf(runtime);
  state.notice = notice;
  return { runtime, result, completed:false, operations:[], notice, persistenceRequested:false };
}

function commit(runtime, index, owner, revealIndex) {
  const state = stateOf(runtime);
  state.board_events[index] = owner.event;
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.board_revealed[revealIndex] = true;
  state.last_operations = [
    ...(owner.operations ?? []).map((operation) => structuredClone(operation)),
    { op:"runtime_reveal_board_cell", board_index:revealIndex, source:"old_statue" },
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
      ? { ...action, meta:"回復・個体ボーナス・道具・お金・盤面1マス開示・一戦の力・野生戦・災いなどを接続済み" }
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
  if (!(resolved.branch === "good" && resolved.effectIndex === 4)) {
    return await resolveBaseOldStatueInteraction(runtime, index, action, options);
  }

  const eligible = eligibleRevealIndices(state, index);
  if (!eligible.length) {
    return pending(runtime, "old_statue_board_reveal_no_eligible_cell", "石像が示せる未開示のマスがありません。イベントと共有RNGは消費していません。");
  }

  ensureSafariEncounterSeed(state);
  const counter = Number(state.preview_encounter_counter ?? 0);
  const selectedIndex = Number(borrowSafariSharedRunRandomInt(runtime, eligible.length));
  const revealIndex = eligible[selectedIndex];
  if (!Number.isInteger(revealIndex) || revealIndex === index || state.board_revealed?.[revealIndex] || state.board_consumed?.[revealIndex]) {
    state.preview_encounter_counter = counter;
    return pending(runtime, "old_statue_board_reveal_commit_failed", "石像の示すマスを確定できませんでした。イベントと共有RNGは消費していません。");
  }

  const owner = resolveOldStatue({
    event,
    choice:"pray",
    outcome:{ effect_index:resolved.effectIndex, status:resolved.status },
  });
  commit(runtime, index, owner, revealIndex);
  state.notice = `石像の加護でDay Boardの${revealIndex + 1}番目のマスが明らかになりました。`;
  return {
    runtime,
    result:owner.outcome,
    completed:true,
    revealedBoardIndex:revealIndex,
    operations:state.last_operations,
    notice:state.notice,
    persistenceRequested:true,
    owner,
  };
}
