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
        // Deliberately differ from Mapless maxpp. Showdown owns current PP for
        // the battle, but its derived move-slot maxpp must not rewrite Mapless
        // progression metadata during terminal commit.
        moves: [{ id: 'thunderbolt', pp: 12, maxpp: 24 }],
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
assert.equal(first.state.party[0].moves[0].maxpp, 15, 'Showdown-derived maxpp must not overwrite Mapless move metadata');
assert.equal(first.state.party[0].heldItem, '');
assert.equal('statusTurns' in first.state.party[0], false, 'non-Sleep terminal state must clear stale Sleep counters');
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
assert.equal(replay.state.party[0].moves[0].maxpp, 15);

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
assert.equal(replayAfterReload.state.party[0].moves[0].maxpp, 15);

// Sleep owns persistent remaining-turn state. It must survive terminal commit and
// serialization so the next Showdown projection does not reroll sleep duration.
const sleeping = stateWithParty();
sleeping.party[0].status = 'slp';
sleeping.party[0].statusTurns = 3;
const sleepSession = {
  resolvedState() {
    return {
      terminal: true,
      winner: 'p1',
      turn: 1,
      p1: [{
        maplessId: 'starter-1',
        hp: 30,
        maxhp: 35,
        status: 'slp',
        statusTurns: 2,
        heldItem: 'oranberry',
        fainted: false,
        moves: [{ id: 'thunderbolt', pp: 14, maxpp: 24 }],
      }],
      p2: [],
    };
  },
};
const sleepCommit = commitShowdownStreamTerminal(sleeping, {
  battleId: 'battle-sleep',
  session: sleepSession,
});
assert.equal(sleepCommit.committed, true);
assert.equal(sleepCommit.state.party[0].status, 'slp');
assert.equal(sleepCommit.state.party[0].statusTurns, 2);
assert.equal(sleepCommit.state.party[0].moves[0].pp, 14);
assert.equal(sleepCommit.state.party[0].moves[0].maxpp, 15);
const sleepRestored = restoreNewCoreSave(serializeNewCoreSave(sleepCommit.state));
assert.equal(sleepRestored.party[0].status, 'slp');
assert.equal(sleepRestored.party[0].statusTurns, 2, 'remaining Sleep turns must survive save/reload');
assert.deepEqual(sleepRestored.diagnostics.appliedBattleStateResultIds, ['showdown-terminal:battle-sleep']);
const sleepReplay = commitShowdownStreamTerminal(sleepRestored, {
  battleId: 'battle-sleep',
  session: sleepSession,
});
assert.equal(sleepReplay.committed, false);
assert.equal(sleepReplay.duplicate, true);
assert.equal(sleepReplay.state.party[0].statusTurns, 2);

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
