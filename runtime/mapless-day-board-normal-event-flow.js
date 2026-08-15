export function resolveDayBoardNormalEventFlow(input = {}) {
  const index = Number.parseInt(input.index, 10);
  const events = Array.isArray(input.board_events) ? input.board_events : [];
  const event = events[index] || null;
  const state = {
    board_visited: [...(input.board_visited || [])],
    board_revealed: [...(input.board_revealed || [])],
    board_consumed: [...(input.board_consumed || [])],
  };
  const operations = [{ op: "ensure_board" }];
  if (!event || event.kind !== "normal_event") {
    operations.push({ op: "delegate_board_cell", index });
    return { state, operations, result: "delegated", notice: null };
  }
  if (state.board_consumed[index] || event.normal_resolved) {
    operations.push({ op: "set_notice", text: "このマスの出来事は終了しています。" }, { op: "play_buzzer" }, { op: "refresh" });
    return { state, operations, result: false, notice: "このマスの出来事は終了しています。" };
  }
  const firstVisit = !state.board_visited[index];
  const pendingHatches = firstVisit ? [...(input.pending_hatches || [])] : [];
  if (firstVisit) {
    state.board_visited[index] = true;
    state.board_revealed[index] = true;
    operations.push({ op: "set_board_visited", index, value: true }, { op: "set_board_revealed", index, value: true }, { op: "progress_first_visit", result: pendingHatches });
  } else {
    state.board_revealed[index] = true;
    operations.push({ op: "set_board_revealed", index, value: true });
  }
  operations.push({ op: "refresh" });
  if (input.autosave_defined) operations.push({ op: "save_on_cell", index, event, first_visit: firstVisit });
  operations.push({ op: "begin_mapless_event_stage", event });
  let notice;
  let result = false;
  if (input.open_error) {
    notice = "出来事を処理できませんでした。";
    operations.push({ op: "open_normal_event", index, event, error: input.open_error }, { op: "set_notice", text: notice }, { op: "log", text: `scene failed: ${input.open_error.class_name}: ${input.open_error.message}` });
  } else {
    operations.push({ op: "open_normal_event", index, event, resolved: input.event_resolution ?? null });
    if (input.open_result && input.normal_resolved_after_open) {
      state.board_consumed[index] = true;
      notice = `${input.event_name || event.normal_event_id || "出来事"}を終えました。`;
      operations.push({ op: "set_board_consumed", index, value: true }, { op: "set_notice", text: notice });
      result = true;
    } else {
      notice = "出来事を保留しました。";
      operations.push({ op: "set_notice", text: notice });
    }
  }
  if (input.event_stage_active !== false) operations.push({ op: "end_mapless_event_stage" });
  if (input.scene_same !== false) operations.push({ op: "hatch_pending", pending: pendingHatches }, { op: "refresh" });
  return { state, operations, result, notice };
}
