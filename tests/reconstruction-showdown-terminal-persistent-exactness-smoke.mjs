import assert from 'node:assert/strict';
import { createInitialGameState } from '../src-next/core/game-state.js';
import { commitShowdownTerminalResult } from '../src-next/core/battle/showdown-roundtrip.js';

function stateWithParty() {
  const state = createInitialGameState({ seed: 29, runId: 'terminal-persistent-exactness' });
  state.party = [{
    id: 'starter-1',
    species: 'Pikachu',
    hp: 35,
    maxhp: 35,
    status: 'par',
    heldItem: 'oranberry',
    moves: [{ id: 'thunderbolt', pp: 15, maxpp: 15 }],
  }];
  return state;
}

function result(overrides = {}) {
  return {
    terminal: true,
    resultId: `terminal-persistent-${JSON.stringify(overrides)}`,
    party: [{
      maplessId: 'starter-1',
      hp: 20,
      maxhp: 35,
      status: 'brn',
      heldItem: '',
      fainted: false,
      moves: [{ id: 'thunderbolt', pp: 12, maxpp: 15 }],
      ...overrides,
    }],
  };
}

const exact = commitShowdownTerminalResult(stateWithParty(), result());
assert.equal(exact.committed, true);
assert.equal(exact.state.party[0].hp, 20);
assert.equal(exact.state.party[0].status, 'brn');
assert.equal(exact.state.party[0].heldItem, '', 'Showdown-authoritative consumed item must commit');

assert.throws(
  () => commitShowdownTerminalResult(stateWithParty(), result({ hp: 20.5 })),
  /Terminal HP commit requires a non-negative integer/,
  'fractional terminal HP must not be truncated',
);

assert.throws(
  () => commitShowdownTerminalResult(stateWithParty(), result({ hp: 36 })),
  /outside Showdown\/persistent bounds/,
  'terminal HP above the observed Showdown max HP must fail closed',
);

assert.throws(
  () => commitShowdownTerminalResult(stateWithParty(), result({ status: 'confusion' })),
  /canonical Showdown major status/,
  'volatile/non-major status must never cross the persistent terminal boundary',
);

assert.throws(
  () => commitShowdownTerminalResult(stateWithParty(), result({ heldItem: 'Oran Berry' })),
  /canonical Showdown item id/,
  'terminal held item must already be the canonical Showdown id',
);

const consumed = commitShowdownTerminalResult(stateWithParty(), result({ heldItem: '' }));
assert.equal(consumed.state.party[0].heldItem, '');

assert.throws(
  () => commitShowdownTerminalResult(stateWithParty(), result({ hp: 0, fainted: false })),
  /terminal faint state/i,
  'Showdown terminal HP=0 must not commit as non-fainted',
);

assert.throws(
  () => commitShowdownTerminalResult(stateWithParty(), result({ hp: 20, fainted: true })),
  /terminal faint state/i,
  'Showdown terminal positive HP must not commit as fainted',
);

assert.throws(
  () => commitShowdownTerminalResult(stateWithParty(), result({ fainted: 'false' })),
  /terminal faint state/i,
  'terminal faint state must be an exact boolean, never truthy-coerced',
);

const fainted = commitShowdownTerminalResult(stateWithParty(), result({ hp: 0, fainted: true }));
assert.equal(fainted.state.party[0].hp, 0);
assert.equal(fainted.state.party[0].fainted, true, 'Showdown-authoritative faint state must commit with HP=0');

console.log('reconstruction showdown terminal persistent exactness smoke: ok');
