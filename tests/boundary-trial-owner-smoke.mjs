import assert from 'node:assert/strict';
import { resolveBoundaryTrialFlow } from '../runtime/mapless-boundary-trial-flow.js';
import { resolveBoundaryTrialBattleHandoff } from '../runtime/mapless-boundary-trial-battle-handoff.js';
import { resolveDayBoardPlayableTurnWithBoundary } from '../runtime/mapless-day-board-boundary-trial-integration.js';

const board = { board_kinds: ['wild','trainer','normal_event','shop','center','egg_shop','normal_event','next_day'] };
const base = { floor: 10, trial_count: 0, selected_leader: 'BROCK', preparation_complete: true };
const pending = resolveBoundaryTrialFlow(base);
assert.equal(pending.result, 'battle_requested');
assert.deepEqual(pending.battle_request.rules, ['canLose', 'cannotRun']);
assert.equal(pending.battle_request.party_size, 3);

const win = resolveBoundaryTrialBattleHandoff({ boundary: { ...base, post_victory_board: board }, battleRuntime: { battleResultHandoff: { decision: 1 } } });
assert.equal(win.result, 'victory_returned_to_board');
assert.equal(win.boundary.state.day, 11);
assert.equal(win.boundary.state.trial_count, 1);
assert.ok(win.boundary.operations.some((op) => op.op === 'heal_party_request'));

const loss = resolveBoundaryTrialBattleHandoff({ boundary: base, battleRuntime: { battleResultHandoff: { decision: 2 } }, runEndPending: true });
assert.equal(loss.result, 'run_end_pending');

const turnBase = {
  index: 7,
  day: 9,
  board_events: [{kind:'wild'},{kind:'trainer'},{kind:'normal_event'},{kind:'shop'},{kind:'center'},{kind:'egg_shop'},{kind:'normal_event'},{kind:'next_day'}],
  board_revealed: Array(8).fill(false),
  board_consumed: Array(8).fill(false),
  next_day: { confirmed: true, boundary: base },
};
const turn = resolveDayBoardPlayableTurnWithBoundary(turnBase);
assert.equal(turn.boundary, 'boundary_trial');
assert.equal(turn.day, 10);
assert.equal(turn.result, 'battle_requested');
assert.equal(turn.state.board_events.length, 0);
console.log('PASS 10/10');
