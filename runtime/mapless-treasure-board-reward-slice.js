export function resolveTreasureBoardRewardSlice(input = {}) {
  const index = Number.parseInt(input.index, 10);
  const events = Array.isArray(input.board_events) ? input.board_events : [];
  const event = events[index] || null;
  const state = {
    board_visited: [...(input.board_visited || [])],
    board_revealed: [...(input.board_revealed || [])],
    board_consumed: [...(input.board_consumed || [])],
  };
  const operations = [{ op: "ensure_board" }];
  if (!event || event.kind !== "treasure") {
    operations.push({ op: "delegate_board_cell", index });
    return { state, operations, result: "delegated", notice: null, open_status: null };
  }
  if (state.board_consumed[index]) {
    operations.push({ op: "set_notice", text: "この宝箱は空になっています。" }, { op: "play_buzzer" }, { op: "refresh" });
    return { state, operations, result: false, notice: "この宝箱は空になっています。", open_status: "empty" };
  }
  const firstVisit = !state.board_visited[index];
  const pending = firstVisit ? [...(input.pending_hatches || [])] : [];
  if (firstVisit) {
    state.board_visited[index] = true;
    state.board_revealed[index] = true;
    operations.push({ op: "set_board_visited", index, value: true }, { op: "set_board_revealed", index, value: true }, { op: "progress_first_visit", result: pending });
  } else {
    state.board_revealed[index] = true;
    operations.push({ op: "set_board_revealed", index, value: true });
  }
  operations.push({ op: "refresh" });
  if (input.autosave_defined) operations.push({ op: "save_on_cell", index, event, first_visit: firstVisit });
  operations.push({ op: "begin_mapless_event_stage", event });
  let status = null;
  let reward = null;
  let notice = null;
  let granted = false;
  try {
    const confirm = input.confirm !== false;
    operations.push({ op: "open_treasure", tier: event.chest_tier ?? "normal", day: Math.max(Number(input.day || 1), 1), seed: event.chest_seed ?? null, confirm });
    if (confirm && input.confirm_choice !== 0) {
      status = "declined";
    } else {
      operations.push({ op: "reward_for_request", result: input.reward ?? null });
      reward = input.reward ?? null;
      if (!reward || typeof reward !== "object" || !reward.items || typeof reward.items !== "object") {
        status = "failed";
      } else {
        let capacityOk = true;
        for (const [itemId, quantity] of Object.entries(reward.items)) {
          const ok = input.capacity_results?.[itemId] !== false;
          operations.push({ op: "bag_can_add_request", item_id: itemId, quantity, result: ok });
          if (!ok) capacityOk = false;
        }
        if (!capacityOk) {
          operations.push({ op: "message", text: "バッグに空きがなく、宝箱の中身を受け取れなかった。" });
          status = "failed";
        } else {
          const added = [];
          let moneyAdded = 0;
          let failed = false;
          for (const [itemId, quantity] of Object.entries(reward.items)) {
            const ok = input.add_results?.[itemId] !== false;
            operations.push({ op: "bag_add_request", item_id: itemId, quantity, result: ok });
            if (!ok) { failed = true; break; }
            added.push([itemId, quantity]);
          }
          if (!failed && Number(reward.money || 0) > 0) {
            moneyAdded = Number(reward.money);
            operations.push({ op: "money_add_request", amount: moneyAdded, result: input.money_result !== false });
            if (input.money_result === false) failed = true;
          }
          if (failed) {
            for (const [itemId, quantity] of added) operations.push({ op: "bag_remove_rollback_request", item_id: itemId, quantity });
            if (moneyAdded > 0) operations.push({ op: "money_remove_rollback_request", amount: moneyAdded });
            operations.push({ op: "message", text: "宝箱の中身を受け取れなかった。" });
            status = "failed";
          } else {
            operations.push({ op: "reward_sound_request", item_ids: Object.keys(reward.items), money: Number(reward.money || 0) });
            status = "granted";
            granted = true;
          }
        }
      }
    }
    if (granted) {
      state.board_consumed[index] = true;
      notice = `${reward.tier_name || event.chest_tier || "宝箱"}を開けました。`;
      operations.push({ op: "set_board_consumed", index, value: true }, { op: "set_notice", text: notice });
    } else {
      notice = status === "failed" ? "宝箱の中身はまだ残っています。" : "宝箱を開けずに立ち去りました。";
      operations.push({ op: "set_notice", text: notice });
    }
  } catch (error) {
    status = "failed";
    notice = "宝箱を開けられませんでした。";
    operations.push({ op: "set_notice", text: notice }, { op: "log", text: `scene failed: ${error.class_name || error.name || "Error"}: ${error.message || String(error)}` });
  } finally {
    if (input.event_stage_active !== false) operations.push({ op: "end_mapless_event_stage" });
    if (input.scene_same !== false) operations.push({ op: "hatch_pending", pending }, { op: "refresh" });
  }
  return { state, operations, result: granted, notice, open_status: status, reward: granted ? reward : null };
}
