import { resolveDayBoardCellDispatch } from "./mapless-day-board-cell-dispatch.js";
import { resolveWildCellActivation } from "./mapless-wild-cell-activation.js";
import { resolveTrainerCellActivation } from "./mapless-trainer-cell-activation.js";
import { advanceDayAndRegenerateBoard } from "./mapless-day-board-advance.js";
import { resolveDayBoardFacilityActivation } from "./mapless-day-board-facilities.js";
import { resolveDayBoardNormalEventFlow } from "./mapless-day-board-normal-event-flow.js";

const REUSABLE_KINDS = new Set(["shop", "egg_shop"]);

function applyHandlerEffects(state, operations, initialNotice) {
  let notice = initialNotice;
  for (const operation of operations) {
    if (operation.op === "set_board_consumed" && operation.index >= 0 && operation.index < state.board_consumed.length) {
      state.board_consumed[operation.index] = operation.value;
    }
    if (operation.op === "set_notice") notice = operation.text;
  }
  return notice;
}

function nestHandler(dispatchOperations, activationOp, handler) {
  return dispatchOperations.map((operation) =>
    operation === activationOp ? { ...operation, resolved: handler } : operation
  );
}

export function resolveDayBoardPlayableTurn(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("input object is required");
  const index = Number.parseInt(input.index, 10);
  const event = Array.isArray(input.board_events) ? input.board_events[index] : null;
  const reusable = Boolean(event && REUSABLE_KINDS.has(event.kind));
  const dispatch = resolveDayBoardCellDispatch({ ...input, reusable });
  const state = {
    board_events: dispatch.state.board_events.map((value) => value && { ...value }),
    board_revealed: [...dispatch.state.board_revealed],
    board_consumed: [...dispatch.state.board_consumed],
    board_visited: [...dispatch.state.board_visited],
  };

  if (dispatch.result !== "dispatched" || !event) {
    return { state, day: input.day, operations: dispatch.operations, boundary: null, result: dispatch.result, notice: dispatch.notice, day_transition: null };
  }

  const activationOp = dispatch.operations.find((operation) => operation.op.startsWith("activate_"));
  const kind = event.kind;

  if (kind === "wild") {
    if (!input.wild) throw new Error("wild decisions are required");
    const handler = resolveWildCellActivation({ ...input.wild, index, event, day: input.day, old_consumed: Boolean(input.board_consumed?.[index]) });
    const notice = applyHandlerEffects(state, handler.operations, dispatch.notice);
    return { state, day: input.day, operations: nestHandler(dispatch.operations, activationOp, handler), boundary: "wild", result: handler.result ? "completed" : "handler_stopped", notice, day_transition: null };
  }

  if (kind === "trainer") {
    if (!input.trainer) throw new Error("trainer decisions are required");
    const handler = resolveTrainerCellActivation({ ...input.trainer, index, day: input.day });
    const notice = applyHandlerEffects(state, handler.operations, dispatch.notice);
    const consumed = handler.operations.some((operation) => operation.op === "set_board_consumed" && operation.index === index && operation.value === true);
    return { state, day: input.day, operations: nestHandler(dispatch.operations, activationOp, handler), boundary: "trainer", result: consumed ? "completed" : "handler_stopped", notice, day_transition: null };
  }

  if (kind === "normal_event") {
    if (!input.normal_event) throw new Error("normal_event resolution is required");
    const handler = resolveDayBoardNormalEventFlow({ ...input, ...input.normal_event, index, event_name: input.normal_event.event_name || event.normal_event_id || "出来事" });
    const notice = applyHandlerEffects(state, handler.operations, dispatch.notice);
    return { state, day: input.day, operations: nestHandler(dispatch.operations, activationOp, handler), boundary: "normal_event", result: handler.result === true ? "completed" : "handler_stopped", notice, day_transition: null };
  }

  if (kind === "next_day") {
    if (!input.next_day) throw new Error("next_day decisions are required");
    const handler = advanceDayAndRegenerateBoard({ day: input.day, selected_index: index, confirmed: input.next_day.confirmed, generation: input.next_day.generation });
    return { state, day: handler.day, operations: nestHandler(dispatch.operations, activationOp, handler), boundary: "next_day", result: handler.board_regenerated ? "day_advanced" : "day_advance_cancelled", notice: handler.notice, day_transition: handler };
  }

  if ((kind === "center" || kind === "shop" || kind === "egg_shop") && input.facility) {
    const handler = resolveDayBoardFacilityActivation({ kind, index, day: input.day, healed: input.facility.healed });
    const notice = applyHandlerEffects(state, handler.operations, dispatch.notice);
    return { state, day: input.day, operations: nestHandler(dispatch.operations, activationOp, handler), boundary: kind, result: handler.result, notice, day_transition: null };
  }

  return { state, day: input.day, operations: dispatch.operations, boundary: kind, result: "external_request", notice: dispatch.notice, day_transition: null };
}
