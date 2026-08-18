import assert from 'node:assert/strict';
import { resolveDayBoardCellDispatch } from '../runtime/mapless-day-board-cell-dispatch.js';
import { resolveDayBoardPlayableTurn } from '../runtime/mapless-day-board-playable-turn.js';
import { advanceDayAndRegenerateBoard } from '../runtime/mapless-day-board-advance.js';

const visited = [true, false, true, false, false, true, false, false];
const base = {
  day: 3,
  board_events: [
    { kind: 'center' },
    { kind: 'shop' },
    { kind: 'normal_event', normal_event_id: 'test_event' },
    { kind: 'wild' },
    { kind: 'trainer' },
    { kind: 'egg_shop' },
    { kind: 'center' },
    { kind: 'next_day' },
  ],
  board_revealed: Array(8).fill(false),
  board_consumed: Array(8).fill(false),
  board_visited: visited,
  notice: 'board',
  scene_is_self: true,
};

const dispatch = resolveDayBoardCellDispatch({ ...base, index: 0, reusable: false });
assert.deepEqual(dispatch.state.board_visited, visited, 'dispatch must preserve authoritative visited state');
assert.notEqual(dispatch.state.board_visited, visited, 'dispatch must clone visited state');

const facility = resolveDayBoardPlayableTurn({ ...base, index: 0, facility: { healed: true } });
assert.deepEqual(facility.state.board_visited, visited, 'playable turn must preserve visited state across a resolved cell');
assert.equal(facility.state.board_consumed[0], true, 'facility resolution still owns consumed mutation');

const generation = {
  pre_shuffle_kinds: ['center', 'shop', 'egg_shop', 'wild', 'wild', 'trainer', 'trainer'],
  shuffle_order: [3, 0, 5, 1, 4, 2, 6],
  next_day_index: 7,
};
const advanced = advanceDayAndRegenerateBoard({ day: 3, selected_index: 7, confirmed: true, generation });
assert.equal(advanced.board_regenerated, true);
assert.equal(advanced.day, 4);
assert.deepEqual(advanced.board_visited, Array(8).fill(false), 'new Board visited state must come from Board generation owner');
assert.deepEqual(advanced.board_revealed, Array(8).fill(false));
assert.deepEqual(advanced.board_consumed, Array(8).fill(false));

const cancelled = advanceDayAndRegenerateBoard({ day: 3, selected_index: 7, confirmed: false, generation });
assert.equal(cancelled.board_regenerated, false);
assert.equal(cancelled.board_visited, null);

console.log('PASS day-board visited owner handoff');
