import { resolveDayBoardNormalEventFlow } from "./mapless-day-board-normal-event-flow.js";

export function resolveDayBoardSleepingGiantSlice(input = {}) {
  const index = Number.parseInt(input.index, 10);
  const events = Array.isArray(input.board_events) ? input.board_events : [];
  const event = events[index] || null;
  const data = input.normal_data || event?.normal_data || {};
  const choice = Number.parseInt(input.choice, 10);
  const eligible = event?.kind === "normal_event" &&
    String(event.normal_event_id || "").toLowerCase() === "sleeping_giant" &&
    !event.normal_resolved && !Boolean((input.board_consumed || [])[index]);

  if (!eligible) {
    const board = resolveDayBoardNormalEventFlow(input);
    return { ...board, vertical_slice: "delegated", event_result: null, battle: null };
  }
  if (!Number.isInteger(choice) || choice < 0) {
    const board = resolveDayBoardNormalEventFlow({ ...input, open_result: false, normal_resolved_after_open: false });
    return { ...board, vertical_slice: "sleeping_giant_pending", event_result: { resolved: false }, battle: null };
  }
  const operations = [];
  let battle = null;
  let rewardRequested = false;
  const item = data.display_item ?? input.display_item ?? null;
  if (choice === 0) {
    operations.push({ op: "message", key: "steal_attempt" });
    if (Number(data.steal_roll ?? input.steal_roll ?? 0) < 65) {
      operations.push({ op: "request_grant_items", items: [item] }); rewardRequested = true;
      operations.push({ op: "message", key: "steal_success" });
    } else {
      operations.push({ op: "message", key: "giant_wakes" });
      battle = { op: "request_wild_battle", type: data.type ?? input.type ?? null, modifier: 3, enemy_stages: { [String(data.boost_stat ?? input.boost_stat ?? "ATTACK")]: 1 }, seed: event.normal_seed ?? input.normal_seed ?? null };
      operations.push(battle);
      if (input.battle_success === true) {
        operations.push({ op: "message", key: "battle_won" }, { op: "request_grant_items", items: [item] }, { op: "message", key: "reward_recovered" }); rewardRequested = true;
      }
    }
  } else if (choice === 1) {
    operations.push({ op: "message", key: "wake_and_fight" });
    battle = { op: "request_wild_battle", type: data.type ?? input.type ?? null, modifier: 3, enemy_stages: { [String(data.boost_stat ?? input.boost_stat ?? "ATTACK")]: 1 }, seed: event.normal_seed ?? input.normal_seed ?? null };
    operations.push(battle);
    if (input.battle_success === true) {
      operations.push({ op: "message", key: "battle_won" }, { op: "request_grant_items", items: [item] }, { op: "message", key: "reward_recovered" }); rewardRequested = true;
    }
  } else {
    operations.push({ op: "leave_event", key: "leave_sleeping_giant" });
  }
  const eventResolution = { resolved: true, reward_requested: rewardRequested, battle_requested: Boolean(battle), battle_success: battle ? input.battle_success === true : null };
  const board = resolveDayBoardNormalEventFlow({ ...input, open_result: true, normal_resolved_after_open: true, event_name: input.event_name || "眠る巨体", event_resolution: eventResolution });
  const composed = [];
  for (const operation of board.operations) {
    if (operation.op === "open_normal_event") {
      composed.push({ op: "open_normal_event", index, event, branch: "sleeping_giant" }, ...operations, { op: "finish_normal_event", normal_resolved: true });
    } else composed.push(operation);
  }
  return { ...board, operations: composed, vertical_slice: "sleeping_giant", event_result: eventResolution, battle };
}
