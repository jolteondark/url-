import assert from 'node:assert/strict';
import { resolveBoundaryTrialFlow } from '../runtime/mapless-boundary-trial-flow.js';
import { assembleDayBoard } from '../runtime/mapless-day-board-generation.js';

const base = {
  floor: 10,
  trial_count: 0,
  selected_leader: 'BROCK',
  preparation_complete: true,
};

const pending = resolveBoundaryTrialFlow(base);
assert.equal(pending.result, 'battle_requested');
assert.equal(pending.battle_request.floor, 10);
assert.equal(pending.battle_request.trial_number, 1);
assert.equal(pending.battle_request.party_size, 3);
assert.deepEqual(pending.battle_request.rules, ['canLose', 'cannotRun']);

const day11Board = assembleDayBoard({ day: 11 });
const victory = resolveBoundaryTrialFlow({
  ...base,
  battle_outcome: 1,
  post_victory_board: day11Board,
});
assert.equal(victory.result, 'victory_returned_to_board');
assert.equal(victory.state.day, 11);
assert.equal(victory.state.trial_count, 1);
assert.deepEqual(victory.board_return, day11Board);
assert.equal(day11Board.board_kinds.length, 8);
assert.ok(day11Board.board_kinds.includes('trainer'));
assert.ok(day11Board.board_kinds.includes('wild'));
assert.ok(day11Board.board_kinds.includes('next_day'));
assert.deepEqual(day11Board.board_consumed, Array(8).fill(false));
assert.deepEqual(day11Board.board_visited, Array(8).fill(false));

const day12Board = assembleDayBoard({ day: 12 });
assert.equal(day12Board.day, 12);
assert.equal(day12Board.board_kinds.length, 8);
assert.ok(day12Board.board_kinds.includes('trainer'));
assert.ok(day12Board.board_kinds.includes('wild'));
assert.ok(day12Board.board_kinds.includes('next_day'));
assert.deepEqual(day12Board.board_consumed, Array(8).fill(false));
assert.deepEqual(day12Board.board_visited, Array(8).fill(false));

console.log('PASS 21/21');
await import('./safari-boundary-return-save-continue-smoke.mjs');
