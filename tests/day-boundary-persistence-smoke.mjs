import assert from "node:assert/strict";
import { resolveDayBoardPlayableTurn } from "../runtime/mapless-day-board-playable-turn.js";
import { ownerResultRequestsPersistence } from "../runtime/safari-owner-result-persistence.js";

const boardEvents = [
  { kind: "next_day", slot: 0 },
  ...Array.from({ length: 7 }, (_, index) => ({ kind: "center", slot: index + 1 })),
];
const generation = {
  pre_shuffle_kinds: ["center", "shop", "egg_shop", "wild", "wild", "trainer", "trainer"],
  shuffle_order: [3, 0, 5, 1, 4, 2, 6],
  next_day_index: 7,
};

const result = resolveDayBoardPlayableTurn({
  index: 0,
  day: 1,
  board_events: boardEvents,
  board_revealed: Array(8).fill(false),
  board_consumed: Array(8).fill(false),
  board_visited: Array(8).fill(false),
  notice: "Day Board",
  scene_is_self: true,
  scene_same: true,
  event_stage_active: true,
  pending_hatches: [],
  next_day: { confirmed: true, generation },
});

assert.equal(result.result, "day_advanced");
assert.equal(result.day_transition.day, 2);
assert.equal(result.day_transition.board_regenerated, true);
assert.deepEqual(result.day_transition.operations, [{ op: "request_save", reason: "day_advanced" }]);
assert.equal(result.operations.some((operation) => operation?.op === "request_save" && operation.reason === "day_advanced"), true);
assert.equal(ownerResultRequestsPersistence(result), true);

const cancelled = resolveDayBoardPlayableTurn({
  index: 0,
  day: 1,
  board_events: boardEvents,
  board_revealed: Array(8).fill(false),
  board_consumed: Array(8).fill(false),
  board_visited: Array(8).fill(false),
  notice: "Day Board",
  scene_is_self: true,
  scene_same: true,
  event_stage_active: true,
  pending_hatches: [],
  next_day: { confirmed: false, generation },
});

assert.equal(cancelled.result, "day_advance_cancelled");
assert.equal(cancelled.operations.some((operation) => operation?.op === "request_save"), false);
assert.equal(ownerResultRequestsPersistence(cancelled), false);

console.log("day boundary persistence smoke: ok");
