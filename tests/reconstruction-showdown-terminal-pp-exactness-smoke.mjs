import assert from 'node:assert/strict';
import { createInitialGameState } from '../src-next/core/game-state.js';
import { commitShowdownTerminalResult } from '../src-next/core/battle/showdown-roundtrip.js';

function stateWithParty() {
  const state = createInitialGameState({ seed: 23, runId: 'terminal-pp-exactness' });
  state.party = [{
    id: 'starter-1',
    species: 'Pikachu',
    hp: 35,
    maxhp: 35,
    status: '',
    heldItem: '',
    moves: [
      { id: 'thunderbolt', pp: 15, maxpp: 15 },
      { id: 'quickattack', pp: 30, maxpp: 30 },
    ],
  }];
  return state;
}

function result(moves) {
  return {
    terminal: true,
    resultId: 'terminal-pp-result',
    party: [{
      maplessId: 'starter-1',
      hp: 20,
      status: '',
      heldItem: '',
      moves,
    }],
  };
}

const exact = commitShowdownTerminalResult(stateWithParty(), result([
  { id: 'thunderbolt', pp: 12, maxpp: 24 },
  { id: 'quickattack', pp: 29, maxpp: 48 },
]));
assert.equal(exact.committed, true);
assert.deepEqual(exact.state.party[0].moves, [
  { id: 'thunderbolt', pp: 12, maxpp: 15 },
  { id: 'quickattack', pp: 29, maxpp: 30 },
]);

assert.throws(
  () => commitShowdownTerminalResult(stateWithParty(), result([
    { id: 'thunderbolt', pp: 12, maxpp: 24 },
  ])),
  /one resolved Showdown move per Mapless move/,
  'missing terminal move state must not silently preserve stale Mapless PP',
);

assert.throws(
  () => commitShowdownTerminalResult(stateWithParty(), result([
    { id: 'thunderbolt', pp: 12, maxpp: 24 },
    { id: 'irontail', pp: 15, maxpp: 24 },
  ])),
  /could not match resolved Showdown move: quickattack/,
  'mismatched terminal move ids must fail closed',
);

assert.throws(
  () => commitShowdownTerminalResult(stateWithParty(), result([
    { id: 'thunderbolt', pp: 12.5, maxpp: 24 },
    { id: 'quickattack', pp: 29, maxpp: 48 },
  ])),
  /requires a non-negative integer/,
  'fractional terminal PP must not be coerced',
);

assert.throws(
  () => commitShowdownTerminalResult(stateWithParty(), result([
    { id: 'thunderbolt', pp: 16, maxpp: 24 },
    { id: 'quickattack', pp: 29, maxpp: 48 },
  ])),
  /outside Mapless bounds/,
  'Showdown current PP above persistent Mapless maxpp must not commit',
);

assert.throws(
  () => commitShowdownTerminalResult(stateWithParty(), result([
    { id: 'thunderbolt', pp: 12, maxpp: 24 },
    { id: 'thunderbolt', pp: 11, maxpp: 24 },
  ])),
  /Duplicate resolved Showdown move id/,
  'duplicate resolved move ids must not collapse through a Map',
);

console.log('reconstruction showdown terminal PP exactness smoke: ok');
