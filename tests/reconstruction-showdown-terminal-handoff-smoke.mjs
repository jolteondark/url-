import assert from 'node:assert/strict';
import { createInitialGameState } from '../src-next/core/game-state.js';
import { serializeNewCoreSave, restoreNewCoreSave } from '../src-next/core/persistence.js';
import { commitShowdownStreamTerminal } from '../src-next/core/battle/showdown-terminal-handoff.js';

function stateWithParty() {
  const state = createInitialGameState({ seed: 17, runId: 'terminal-handoff-smoke' });
  state.party = [{
    id: 'starter-1',
    species: 'Pikachu',
    hp: 35,
    maxhp: 35,
    status: '',
    heldItem: 'oranberry',
    moves: [{ id: 'thunderbolt', pp: 15, maxpp: 15 }],
    boosts: { spe: 2 },
    volatile: { charge: true },
  }];
  return state;
}

const terminalSession = {
  resolvedState() {
    return {
      terminal: true,
      winner: 'p1',
      turn: 3,
      p1: [{
        maplessId: 'starter-1',
        hp: 19,
        maxhp: 35,
        status: 'par',
        heldItem: '',
        fainted: false,
        moves: [{ id: 'thunderbolt', pp: 12, maxpp: 15 }],
      }],
      p2: [],
    };
  },
};

const initial = stateWithParty();
const first = commitShowdownStreamTerminal(initial, {
  battleId: 'battle-17',
  session: terminalSession,
});
assert.equal(first.committed, true);
assert.equal(first.duplicate, false);
assert.equal(first.state.party[0].hp, 19);
assert.equal(first.state.party[0].status, 'par');
assert.equal(first.state.party[0].moves[0].pp, 12);
assert.equal(first.state.party[0].heldItem, '');
assert.equal('boosts' in first.state.party[0], false);
assert.equal('volatile' in first.state.party[0], false);

const replay = commitShowdownStreamTerminal(first.state, {
  battleId: 'battle-17',
  session: terminalSession,
});
assert.equal(replay.committed, false);
assert.equal(replay.duplicate, true);
assert.equal(replay.state, first.state);
assert.equal(replay.state.party[0].moves[0].pp, 12);

const restored = restoreNewCoreSave(serializeNewCoreSave(first.state));
assert.notEqual(restored, first.state, 'reload must reconstruct state from serialized data');
assert.deepEqual(restored.diagnostics.appliedBattleStateResultIds, ['showdown-terminal:battle-17']);
const replayAfterReload = commitShowdownStreamTerminal(restored, {
  battleId: 'battle-17',
  session: terminalSession,
});
assert.equal(replayAfterReload.committed, false, 'terminal replay after reload must not commit twice');
assert.equal(replayAfterReload.duplicate, true);
assert.equal(replayAfterReload.state, restored);
assert.equal(replayAfterReload.state.party[0].hp, 19);
assert.equal(replayAfterReload.state.party[0].moves[0].pp, 12);

assert.throws(
  () => commitShowdownStreamTerminal(stateWithParty(), {
    battleId: 'battle-live',
    session: { resolvedState: () => ({ terminal: false, p1: [] }) },
  }),
  /non-terminal/,
);
assert.throws(
  () => commitShowdownStreamTerminal(stateWithParty(), { battleId: '', session: terminalSession }),
  /battleId/,
);

console.log('reconstruction showdown terminal handoff smoke: ok');
