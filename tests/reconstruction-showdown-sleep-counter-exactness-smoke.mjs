import assert from 'node:assert/strict';
import {
  projectMaplessPokemonToShowdown,
  commitShowdownTerminalResult,
} from '../src-next/core/battle/showdown-roundtrip.js';

function sleepingMember(statusTurns) {
  return {
    id: 'sleepy',
    species: 'Pikachu',
    hp: 17,
    maxhp: 35,
    status: 'slp',
    statusTurns,
    heldItem: '',
    moves: [{ id: 'thunderbolt', pp: 3, maxpp: 15 }],
  };
}

assert.equal(projectMaplessPokemonToShowdown(sleepingMember(2)).statusTurns, 2);
for (const turns of [undefined, 0, -1, 1.5, Number.NaN]) {
  assert.throws(
    () => projectMaplessPokemonToShowdown(sleepingMember(turns)),
    /Persistent sleep projection requires a positive integer statusTurns/,
    `starting Sleep counter ${String(turns)} must fail closed instead of being clamped or omitted`,
  );
}

const state = {
  party: [sleepingMember(3)],
  diagnostics: {},
};
function terminalResult(statusTurns, resultId) {
  return {
    terminal: true,
    resultId,
    party: [{
      maplessId: 'sleepy',
      hp: 17,
      status: 'slp',
      statusTurns,
      heldItem: '',
      moves: [{ id: 'thunderbolt', pp: 3, maxpp: 15 }],
    }],
  };
}

const committed = commitShowdownTerminalResult(state, terminalResult(2, 'sleep-valid'));
assert.equal(committed.state.party[0].statusTurns, 2);
for (const turns of [undefined, 0, -1, 1.5, Number.NaN]) {
  assert.throws(
    () => commitShowdownTerminalResult(state, terminalResult(turns, `sleep-invalid-${String(turns)}`)),
    /Terminal sleep projection requires a positive integer statusTurns/,
    `terminal Sleep counter ${String(turns)} must fail closed instead of mutating persistent state`,
  );
}

console.log('reconstruction Showdown exact Sleep counter smoke: ok');
