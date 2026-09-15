import assert from 'node:assert/strict';
import { createInitialGameState } from '../src-next/core/game-state.js';
import {
  createShowdownBattleSnapshot,
  commitShowdownTerminalResult,
} from '../src-next/core/battle/showdown-roundtrip.js';

const original = createInitialGameState({
  runId: 'showdown-spike',
  seed: 7,
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

// Stand-in for the resolved raw Showdown terminal projection. The actual engine
// differential fixture will replace this seam once the pinned runtime is vendored/bundled.
const resolved = {
  terminal: true,
  resultId: 'b-1:terminal:1',
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
// Transient fields are never imported from Showdown; pre-battle Mapless copies are
// not authoritative either and must eventually be removed by battle-start ownership.
assert.deepEqual(first.state.party[0].volatile, original.party[0].volatile);
assert.deepEqual(first.state.party[0].statStages, original.party[0].statStages);

const replay = commitShowdownTerminalResult(first.state, resolved);
assert.equal(replay.committed, false);
assert.equal(replay.duplicate, true);
assert.equal(replay.state, first.state);
assert.deepEqual(replay.state.diagnostics.appliedResultIds, ['b-1:terminal:1']);

assert.throws(() => commitShowdownTerminalResult(original, { ...resolved, terminal: false }), /Only terminal/);
console.log('reconstruction showdown round-trip smoke: ok');
