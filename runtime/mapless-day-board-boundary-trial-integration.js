import { resolveDayBoardPlayableTurn } from "./mapless-day-board-playable-turn.js";
import { resolveDayBoardCellDispatch } from "./mapless-day-board-cell-dispatch.js";
import { applyNextDayTransition } from "./mapless-day-board-next-day.js";
import { isBoundaryTrialFloor, resolveBoundaryTrialFlow } from "./mapless-boundary-trial-flow.js";

function nestBoundary(dispatchOperations, handler) {
  return dispatchOperations.map((operation) =>
    operation.op === "activate_next_day_cell" ? { ...operation, resolved: handler } : operation
  );
}

export function resolveDayBoardPlayableTurnWithBoundary(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("input object is required");
  const index = Number.parseInt(input.index, 10);
  const event = Array.isArray(input.board_events) ? input.board_events[index] : null;
  const confirmed = Boolean(input.next_day?.confirmed);
  const transition = event?.kind === "next_day" && confirmed
    ? applyNextDayTransition(input.day, index, true)
    : null;

  if (!transition || !isBoundaryTrialFloor(transition.day)) {
    return resolveDayBoardPlayableTurn(input);
  }
  if (!input.next_day?.boundary) throw new Error("boundary trial resolution is required on a trial floor");

  const dispatch = resolveDayBoardCellDispatch({ ...input, reusable: false });
  if (dispatch.result !== "dispatched") return resolveDayBoardPlayableTurn(input);

  const handler = resolveBoundaryTrialFlow({ ...input.next_day.boundary, floor: transition.day });
  return {
    state: { board_events: [], board_revealed: [], board_consumed: [] },
    day: handler.state.day,
    operations: nestBoundary(dispatch.operations, handler),
    boundary: "boundary_trial",
    result: handler.result,
    notice: input.next_day.boundary.notice ?? "境界の試練",
    day_transition: handler,
  };
}
