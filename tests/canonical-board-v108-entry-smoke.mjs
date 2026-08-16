import assert from 'node:assert/strict';
import { assembleDayBoard } from '../runtime/mapless-day-board-generation.js';
import { resolveDayBoardCellDispatch } from '../runtime/mapless-day-board-cell-dispatch.js';

for (let day = 1; day <= 32; day += 1) {
  const board = assembleDayBoard({ day });
  assert.equal(board.board_kinds.length, 8);
  assert.equal(board.board_kinds.filter((kind) => kind === 'next_day').length, 1);
  assert.ok(board.board_kinds.includes('wild'));
  assert.ok(board.board_kinds.includes('trainer'));
  const nonRepeatable = board.selected_extra_kinds.filter((kind) => kind !== 'wild' && kind !== 'trainer');
  assert.equal(new Set(nonRepeatable).size, nonRepeatable.length);
}

const dayFour = assembleDayBoard({ day: 4 });
assert.ok(dayFour.board_kinds.includes('normal_event'));

function dispatchFor(event) {
  return resolveDayBoardCellDispatch({
    index: 0,
    board_events: [event],
    board_revealed: [false],
    board_consumed: [false],
    reusable: false,
    scene_is_self: true,
  });
}

const unresolvedNormal = dispatchFor({ kind: 'normal_event' });
assert.equal(unresolvedNormal.result, 'external_request');
assert.equal(unresolvedNormal.state.board_consumed[0], false);

const unresolvedTrap = dispatchFor({ kind: 'trap' });
assert.equal(unresolvedTrap.result, 'external_request');
assert.equal(unresolvedTrap.state.board_consumed[0], false);

const resolvedNormal = dispatchFor({ kind: 'normal_event', normal_event_id: 'machine_gacha' });
assert.equal(resolvedNormal.result, 'dispatched');
assert.equal(resolvedNormal.state.board_consumed[0], false);

console.log('canonical board v0.9.108 entry smoke: PASS');
