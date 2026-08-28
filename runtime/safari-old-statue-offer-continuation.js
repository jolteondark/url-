export * from "./safari-old-statue-offer-bonus.js?v=20260826-1825";

import { resolveOldStatue } from "./mapless-old-statue-flow.js";
import { maplessNormalEventScalingValue } from "./mapless-normal-event-medium-reward.js";
import { projectMaplessNormalEventOptionalReward } from "./mapless-normal-event-optional-reward.js";
import { registerSafariNormalEventBattleContinuation } from "./safari-normal-event-battle-continuation.js";
import { applySafariLargeItemReward, preflightSafariSharedLargeItemReward } from "./safari-large-item-reward.js";
import { borrowSafariSharedRunRandomInt, ensureSafariEncounterSeed } from "./safari-encounter-randomization.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function battleSucceeded(summary = {}) {
  const decision = Number(summary.decision);
  return decision === 1 || decision === 4;
}
function sharedLargeReward(runtime) {
  const state = stateOf(runtime);
  ensureSafariEncounterSeed(state);
  const counter = Number(state.preview_encounter_counter ?? 0);
  const reward = preflightSafariSharedLargeItemReward(
    runtime,
    state.day,
    (limit) => borrowSafariSharedRunRandomInt(runtime, limit),
    1,
  );
  if (!reward.success) state.preview_encounter_counter = counter;
  return reward;
}
function commit(runtime, index, owner, operations, notice) {
  const state = stateOf(runtime);
  state.board_events[index] = owner.event;
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  state.board_consumed[index] = Boolean(owner.event.normal_resolved);
  state.last_operations = [...operations, { op:"request_save", reason:"old_statue_post_battle" }];
  state.notice = notice;
  return {
    runtime,
    result:owner.outcome,
    completed:true,
    terminal:true,
    operations:state.last_operations,
    notice:state.notice,
    persistenceRequested:true,
    owner,
  };
}

registerSafariNormalEventBattleContinuation("old_statue", (runtime, continuation) => {
  const state = stateOf(runtime);
  const index = Number(continuation.boardIndex);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "old_statue") throw new Error("old_statue continuation requires originating event");

  if (continuation.actionId === "offer") {
    const offeredItem = String(continuation.payload?.offered_item ?? "");
    const battleType = String(continuation.payload?.battle_type ?? "");
    if (!offeredItem || !battleType) throw new Error("old_statue offer continuation payload is incomplete");
    const owner = resolveOldStatue({
      event,
      choice:"offer",
      offered_item:offeredItem,
      remove_result:true,
      scaling_value:maplessNormalEventScalingValue(state.day),
      outcome:{ effect_index:0, type_id:battleType },
    });
    return commit(
      runtime,
      index,
      owner,
      (owner.operations ?? [])
        .filter((operation) => !["choose_consumable", "remove_item", "start_wild_battle"].includes(operation?.op))
        .map((operation) => structuredClone(operation)),
      "供物を受け取った石像との戦いを終えました。",
    );
  }

  if (continuation.actionId === "break") {
    const success = battleSucceeded(continuation.battleReturn);
    const owner = resolveOldStatue({ event, choice:"break", battle_success:success });
    if (!success) {
      return commit(
        runtime,
        index,
        owner,
        (owner.operations ?? [])
          .filter((operation) => !["start_wild_battle", "grant_random"].includes(operation?.op))
          .map((operation) => structuredClone(operation)),
        "石像の守護者との戦いを終えました。",
      );
    }

    const reward = sharedLargeReward(runtime);
    const optionalReward = projectMaplessNormalEventOptionalReward({ ownerResult:owner, rewardResult:reward });
    const applied = reward.success ? applySafariLargeItemReward(runtime, reward) : [];
    const operations = [
      ...(owner.operations ?? [])
        .filter((operation) => !["start_wild_battle", "grant_random"].includes(operation?.op))
        .map((operation) => structuredClone(operation)),
      ...(reward.success ? reward.operations : optionalReward.rewardOperations).map((operation) => structuredClone(operation)),
      ...applied,
    ];
    const item = reward.selectedItems?.[0] ?? "道具";
    const result = commit(
      runtime,
      index,
      owner,
      operations,
      reward.success
        ? `石像の守護者を倒し、${item}を手に入れました。`
        : "石像の守護者を倒しましたが、バッグがいっぱいで報酬は持ち帰れませんでした。",
    );
    return { ...result, reward, optionalReward };
  }

  throw new Error(`unsupported old_statue continuation: ${continuation.actionId}`);
});
