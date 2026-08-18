export function resolveDayBoardCellDispatch(input) {
  const state = {
    board_events: Array.isArray(input.board_events) ? input.board_events.map((value) => value && { ...value }) : [],
    board_revealed: Array.isArray(input.board_revealed) ? [...input.board_revealed] : [],
    board_consumed: Array.isArray(input.board_consumed) ? [...input.board_consumed] : [],
    board_visited: Array.isArray(input.board_visited) ? [...input.board_visited] : [],
  };
  const index = Number.parseInt(input.index, 10);
  const operations = [{ op: "ensure_board" }];
  const event = state.board_events[index];
  if (!event) {
    return { state, operations, result: null, notice: input.notice ?? "" };
  }

  state.board_revealed[index] = true;
  operations.push({ op: "refresh" });

  if (state.board_consumed[index] && !Boolean(input.reusable)) {
    const notice = "このマスのイベントは終了しています。";
    operations.push({ op: "buzzer" }, { op: "refresh" });
    return { state, operations, result: "already_consumed", notice };
  }

  let notice = input.notice ?? "";
  let result = "dispatched";
  switch (event.kind) {
    case "next_day":
      operations.push({ op: "activate_next_day_cell" });
      break;
    case "wild":
      operations.push({ op: "activate_wild_cell", index, event });
      break;
    case "trainer":
      operations.push({ op: "activate_trainer_cell", index });
      break;
    case "normal_event":
      if (event.normal_event_id) {
        operations.push({ op: "activate_normal_event_cell", index, event });
      } else {
        notice = "この出来事はcanonicalイベント接続待ちです。";
        operations.push({ op: "request_external_event", index, kind: event.kind });
        result = "external_request";
      }
      break;
    case "center":
      operations.push({ op: "activate_center_cell", index });
      break;
    case "shop":
      operations.push({ op: "activate_shop_cell" });
      break;
    case "egg_shop":
      operations.push({ op: "activate_egg_shop_cell" });
      break;
    default:
      notice = "このイベントはSafari接続待ちです。";
      operations.push({ op: "request_external_event", index, kind: event.kind });
      result = "external_request";
      break;
  }
  if (Boolean(input.scene_is_self)) {
    operations.push({ op: "refresh" });
  }
  return { state, operations, result, notice };
}
