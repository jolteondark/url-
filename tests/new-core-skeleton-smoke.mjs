import assert from 'node:assert/strict';
import { createInitialGameState, assertSerializableGameState } from '../src-next/core/game-state.js';
import { nextGameplayRandom } from '../src-next/core/rng.js';
import { step } from '../src-next/core/step.js';

const initial = createInitialGameState({ runId: 'fixture', seed: 108, party: [{ species: 'PIKACHU', hp: 20, pp: [35] }] });
assert.deepEqual(assertSerializableGameState(initial), initial);
assert.deepEqual(nextGameplayRandom(108), nextGameplayRandom(108));

const slots = Array.from({ length: 8 }, (_, i) => ({ kind: i === 3 ? 'wild' : 'event', id: `slot-${i}`, encounter: i === 3 ? { species: 'RATTATA' } : undefined }));
const board = step(initial, { type: 'BOARD_GENERATED', slots });
assert.equal(board.state.board.length, 8);
assert.equal(initial.board, null, 'step must not mutate input state');

const selected = step(board.state, { type: 'BOARD_SELECT', slot: 3 });
assert.equal(selected.state.mode, 'battle_pending');
assert.equal(selected.state.board[3].consumed, false, 'navigation/request must not consume slot');
assert.equal(selected.events.at(-1).type, 'BATTLE_REQUESTED');

const battleId = selected.state.activeBattle.id;
const terminal = step(selected.state, { type: 'BATTLE_TERMINAL_RESULT', battleId, resultId: 'result-1', outcome: 'win' });
assert.equal(terminal.state.board[3].consumed, true);
assert.equal(terminal.state.boardSelectionsRemaining, 7);
assert.equal(terminal.state.mode, 'board');
assert.deepEqual(terminal.effects, [{ type: 'REQUEST_SAVE', reason: 'battle_terminal_result' }]);

const replayState = structuredClone(terminal.state);
replayState.activeBattle = { id: battleId, status: 'terminal', resultCommitted: false };
const replay = step(replayState, { type: 'BATTLE_TERMINAL_RESULT', battleId, resultId: 'result-1', outcome: 'win' });
assert.equal(replay.state.boardSelectionsRemaining, 7, 'terminal replay must not double-consume');
assert.equal(replay.effects.length, 0, 'terminal replay must not request another save');

console.log('new-core-skeleton-smoke: ok');
