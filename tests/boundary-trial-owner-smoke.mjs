import assert from 'node:assert/strict';
import { resolveBoundaryTrialFlow } from '../runtime/mapless-boundary-trial-flow.js';

const board = { board_kinds: ['wild','trainer','normal_event','shop','center','egg_shop','normal_event','next_day'] };
const base = { floor: 10, trial_count: 0, selected_leader: 'BROCK', preparation_complete: true };

const pending = resolveBoundaryTrialFlow(base);
assert.equal(pending.result, 'battle_requested');
assert.deepEqual(pending.battle_request.rules, ['canLose', 'cannotRun']);
assert.equal(pending.battle_request.party_size, 3);

const win = resolveBoundaryTrialFlow({ ...base, post_victory_board: board, battle_outcome: 1 });
assert.equal(win.result, 'victory_returned_to_board');
assert.equal(win.state.day, 11);
assert.equal(win.state.trial_count, 1);
assert.ok(win.operations.some((op) => op.op === 'heal_party_request'));
assert.deepEqual(win.board_return, board);

const loss = resolveBoundaryTrialFlow({ ...base, battle_outcome: 2, run_end_pending: true });
assert.equal(loss.result, 'run_end_pending');
assert.ok(loss.operations.some((op) => op.op === 'run_end_handoff'));

console.log('PASS 10/10');
