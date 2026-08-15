function int(v, n) {
  const x = Number(v);
  if (!Number.isInteger(x)) throw new TypeError(`${n} must be an integer`);
  return x;
}
function clone(v) { return JSON.parse(JSON.stringify(v)); }

export function setMovePp(move, pp, transformed = false) {
  const m = clone(move);
  pp = int(pp, "pp");
  m.pp = pp;
  if (m.realMoveId && m.id === m.realMoveId && !transformed) m.realMovePp = pp;
  return m;
}

export function reduceMovePp(move, options = {}) {
  const m = clone(move);
  if (options.multiTurn) return { success: true, move: m, operations: [{ op: "pp_unchanged", reason: "multi_turn" }] };
  if (int(m.pp, "move.pp") < 0) return { success: true, move: m, operations: [{ op: "pp_unchanged", reason: "special_call" }] };
  if (int(m.totalPp, "move.totalPp") <= 0) return { success: true, move: m, operations: [{ op: "pp_unchanged", reason: "infinite_pp" }] };
  if (m.pp === 0) return { success: false, move: m, operations: [{ op: "pp_empty" }] };
  const updated = setMovePp(m, m.pp - 1, Boolean(options.transformed));
  return {
    success: true,
    move: updated,
    operations: [
      { op: "set_pp", pp: updated.pp, realMovePp: updated.realMovePp ?? null },
      { op: "runtime_pp_reflection", pp: updated.realMovePp ?? updated.pp },
    ],
  };
}

function setStatus(state, status) {
  if (state.status === "SLEEP" && status !== "SLEEP") state.truant = false;
  if (status !== "POISON" || state.statusCount === 0) state.toxic = 0;
  state.status = status;
  if (status !== "POISON" && status !== "SLEEP") state.statusCount = 0;
}
function setStatusCount(state, count) { state.statusCount = int(count, "statusCount"); }

export function inflictStatus(input) {
  const state = clone(input.state ?? { status: "NONE", statusCount: 0, toxic: 0, outrage: 0, currentMove: null, truant: false });
  const operations = [];
  const newStatus = input.newStatus;
  const count = int(input.newStatusCount ?? 0, "newStatusCount");
  setStatus(state, newStatus);
  setStatusCount(state, count);
  state.toxic = 0;
  operations.push({ op: "status_set", status: state.status, statusCount: state.statusCount });
  operations.push({ op: "check_form_on_status_change" });
  operations.push({ op: "on_status_inflicted_ability_request", status: newStatus });
  operations.push({ op: "item_status_cure_check_request" });
  if (input.itemCureResult) {
    setStatus(state, input.itemCureResult.status);
    setStatusCount(state, input.itemCureResult.statusCount ?? 0);
    operations.push({ op: "resolved_item_status_cure", status: state.status, statusCount: state.statusCount });
  }
  operations.push({ op: "ability_status_cure_check_request" });
  if (input.abilityCureResult) {
    setStatus(state, input.abilityCureResult.status);
    setStatusCount(state, input.abilityCureResult.statusCount ?? 0);
    operations.push({ op: "resolved_ability_status_cure", status: state.status, statusCount: state.statusCount });
  }
  if (state.status === "SLEEP" && int(state.outrage ?? 0, "outrage") > 0) {
    state.outrage = 0;
    state.currentMove = null;
    operations.push({ op: "cancel_outrage" });
  }
  operations.push({ op: "runtime_status_reflection", status: state.status, statusCount: state.statusCount });
  return { state, operations };
}

export function cureStatus(input) {
  const state = clone(input.state);
  const oldStatus = state.status;
  setStatus(state, "NONE");
  return {
    oldStatus,
    state,
    operations: [
      { op: "cure_status", oldStatus, showMessages: input.showMessages !== false },
      { op: "runtime_status_reflection", status: state.status, statusCount: state.statusCount },
    ],
  };
}
