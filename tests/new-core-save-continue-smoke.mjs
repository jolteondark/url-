import assert from 'node:assert/strict';
import { createInitialGameState } from '../src-next/core/game-state.js';
import { step } from '../src-next/core/step.js';
import { serializeNewCoreSave, restoreNewCoreSave } from '../src-next/core/persistence.js';

const initial = createInitialGameState({
  runId: 'save-smoke',
  seed: 108,
  party: [{ id: 'p1', species: 'PIKACHU', hp: 20, maxhp: 35, moves: [{ id: 'THUNDERSHOCK', pp: 29, maxpp: 30 }] }],
});
const board = step(initial, {
  type: 'BOARD_GENERATED',
  slots: Array.from({ length: 8 }, (_, i) => ({ kind: 'wild', encounter: { species: i === 0 ? 'RATTATA' : 'PIDGEY' } })),
}).state;
const pending = step(board, { type: 'BOARD_SELECT', slot: 0 }).state;
const terminal = step(pending, {
  type: 'BATTLE_TERMINAL_RESULT',
  battleId: pending.activeBattle.id,
  resultId: 'result-1',
  outcome: 'win',
});
assert.equal(terminal.effects.filter((effect) => effect.type === 'REQUEST_SAVE').length, 1);

const serialized = serializeNewCoreSave(terminal.state);
const restored = restoreNewCoreSave(serialized);
assert.deepEqual(restored, terminal.state);
assert.equal(restored.board[0].consumed, true);
assert.equal(restored.boardSelectionsRemaining, 7);
assert.deepEqual(restored.diagnostics.appliedResultIds, ['result-1']);
assert.throws(() => step(restored, {
  type: 'BATTLE_TERMINAL_RESULT',
  battleId: pending.activeBattle.id,
  resultId: 'result-1',
  outcome: 'win',
}), /active battle/);

assert.throws(() => restoreNewCoreSave(JSON.stringify({
  format: 'mapless-new-core',
  schemaVersion: 999,
  state: restored,
})), /schema/);
