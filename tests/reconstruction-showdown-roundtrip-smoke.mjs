import assert from 'node:assert/strict';
import { createInitialGameState } from '../src-next/core/game-state.js';
import { step } from '../src-next/core/step.js';
import {
  createShowdownBattleSnapshot,
  commitShowdownTerminalResult,
} from '../src-next/core/battle/showdown-roundtrip.js';

const original = createInitialGameState({
  runId: 'showdown-spike', seed: 7,
  party: [{
    id: 'p1-a', species: 'PIKACHU', level: 50,
    hp: 100, maxhp: 100, status: '', heldItem: 'ORANBERRY',
    moves: [{ id: 'THUNDERBOLT', pp: 15, maxpp: 15 }],
    volatile: { confusion: 2 }, statStages: { atk: 2 },
  }],
});

const snapshot = createShowdownBattleSnapshot(original, { battleId: 'b-1' });
assert.equal(snapshot.party[0].hp, 100);
assert.equal(snapshot.party[0].moves[0].pp, 15);
assert.equal('volatile' in snapshot.party[0], false);
assert.equal('statStages' in snapshot.party[0], false);

// Stand-in for raw Showdown terminal state until the pinned runtime is vendored.
const resolved = {
  terminal: true, resultId: 'showdown-spike:d1:s0:terminal:1',
  party: [{
    maplessId: 'p1-a', hp: 0, status: 'brn', heldItem: '',
    moves: [{ id: 'THUNDERBOLT', pp: 14, maxpp: 15 }],
    volatile: { confusion: 1 }, statStages: { atk: -1 },
  }],
};

const first = commitShowdownTerminalResult(original, resolved);
assert.equal(first.committed, true);
assert.equal(first.state.party[0].hp, 0);
assert.equal(first.state.party[0].status, 'brn');
assert.equal(first.state.party[0].moves[0].pp, 14);
assert.equal(first.state.party[0].heldItem, '');
assert.equal('volatile' in first.state.party[0], false);
assert.equal('statStages' in first.state.party[0], false);
assert.deepEqual(first.state.diagnostics.appliedResultIds, []);
assert.deepEqual(first.state.diagnostics.appliedBattleStateResultIds, [resolved.resultId]);

const replay = commitShowdownTerminalResult(first.state, resolved);
assert.equal(replay.committed, false);
assert.equal(replay.duplicate, true);
assert.equal(replay.state, first.state);
assert.throws(() => commitShowdownTerminalResult(original, { ...resolved, terminal: false }), /Only terminal/);

// Persistent battle sync must not consume the Core lifecycle result ID: the same
// terminal result still has to consume the Board slot, return to Board, and save once.
const slots = Array.from({ length: 8 }, (_, i) => i === 0
  ? { kind: 'wild', encounter: { species: 'RATTATA' } }
  : { kind: 'event' });
const board = step(first.state, { type: 'BOARD_GENERATED', slots }).state;
const pending = step(board, { type: 'BOARD_SELECT', slot: 0 }).state;
const synced = commitShowdownTerminalResult(pending, resolved).state;
const terminal = step(synced, {
  type: 'BATTLE_TERMINAL_RESULT',
  battleId: pending.activeBattle.id,
  resultId: resolved.resultId,
  outcome: 'loss',
});
assert.equal(terminal.state.mode, 'board');
assert.equal(terminal.state.board[0].consumed, true);
assert.deepEqual(terminal.state.diagnostics.appliedResultIds, [resolved.resultId]);
assert.deepEqual(terminal.effects, [{ type: 'REQUEST_SAVE', reason: 'battle_terminal_result' }]);

console.log('reconstruction showdown round-trip smoke: ok');
