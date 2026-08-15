export function attemptSafariFlee(runtime) {
  const state = runtime?.variables?.mapless;
  const battle = state?.battle;
  if (!state || !battle || battle.completed) {
    throw new Error("active battle is required");
  }

  if (battle.kind !== "wild" || battle.origin === "village_bounty") {
    state.notice = "この戦闘からは逃げられない！";
    const operations = [{ op: "battle_flee", result: false, reason: "escape_blocked" }];
    state.last_operations = operations;
    return { runtime, escaped: false, blocked: true, operations };
  }

  const index = Number(battle.board_index);
  if (Number.isInteger(index) && index >= 0) {
    if (Array.isArray(state.board_consumed) && index < state.board_consumed.length) {
      state.board_consumed[index] = true;
    }
    if (Array.isArray(state.board_visited) && index < state.board_visited.length) {
      state.board_visited[index] = true;
    }
  }

  const operations = [
    { op: "battle_flee", result: true, decision: 3 },
    { op: "return_to_day_board" },
    { op: "request_save", reason: "battle_flee" },
  ];
  state.battle = null;
  state.location = "day_board";
  state.notice = "うまく逃げ切った！";
  state.last_operations = operations;
  return { runtime, escaped: true, blocked: false, target: "day_board", operations };
}
