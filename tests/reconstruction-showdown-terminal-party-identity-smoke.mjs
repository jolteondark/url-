import assert from 'node:assert/strict';
import { createInitialGameState } from '../src-next/core/game-state.js';
import {
  commitShowdownTerminalResult,
  projectMaplessPartyToShowdown,
} from '../src-next/core/battle/showdown-roundtrip.js';

function member(id, species) {
  return {
    id,
    species,
    hp: 35,
    maxhp: 35,
    status: '',
    heldItem: '',
    moves: [{ id: 'tackle', pp: 35, maxpp: 35 }],
  };
}

function resolved(maplessId, species) {
  return {
    maplessId,
    species,
    hp: 30,
    maxhp: 35,
    status: '',
    heldItem: '',
    fainted: false,
    moves: [{ id: 'tackle', pp: 34, maxpp: 35 }],
  };
}

function stateWithParty() {
  const state = createInitialGameState({ seed: 31, runId: 'terminal-party-identity' });
  state.party = [member('starter-1', 'Pikachu'), member('starter-2', 'Eevee')];
  return state;
}

function result(party, suffix) {
  return { terminal: true, resultId: `terminal-party-${suffix}`, party };
}

const projected = projectMaplessPartyToShowdown(stateWithParty().party);
assert.deepEqual(projected.map((m) => m.maplessId), ['starter-1', 'starter-2']);

const missingProjectionId = member('starter-1', 'Pikachu');
delete missingProjectionId.id;
assert.throws(
  () => projectMaplessPartyToShowdown([missingProjectionId]),
  /Battle projection requires a stable persistent Mapless member id/,
  'species must never stand in for stable identity at starting projection',
);

assert.throws(
  () => projectMaplessPartyToShowdown([
    member('starter-1', 'Pikachu'),
    member('starter-1', 'Eevee'),
  ]),
  /Battle projection requires unique persistent Mapless member ids/,
  'ambiguous starting party identity must fail before Showdown projection',
);

const exact = commitShowdownTerminalResult(stateWithParty(), result([
  resolved('starter-2', 'Eevee'),
  resolved('starter-1', 'Pikachu'),
], 'exact'));
assert.equal(exact.committed, true);
assert.deepEqual(exact.state.party.map((m) => [m.id, m.hp, m.moves[0].pp]), [
  ['starter-1', 30, 34],
  ['starter-2', 30, 34],
]);

assert.throws(
  () => commitShowdownTerminalResult(stateWithParty(), result([resolved('starter-1', 'Pikachu')], 'missing')),
  /one resolved Showdown member per persistent member/,
  'partial terminal party must never partially commit',
);

assert.throws(
  () => commitShowdownTerminalResult(stateWithParty(), result([
    resolved('starter-1', 'Pikachu'),
    resolved('starter-1', 'Pikachu'),
  ], 'duplicate')),
  /Duplicate resolved Showdown maplessId/,
  'duplicate resolved identity must fail closed',
);

assert.throws(
  () => commitShowdownTerminalResult(stateWithParty(), result([
    resolved('starter-1', 'Pikachu'),
    resolved('intruder', 'Eevee'),
  ], 'unknown')),
  /unknown resolved Showdown member/,
  'unknown resolved identity must fail closed',
);

const duplicatePersistent = stateWithParty();
duplicatePersistent.party[1].id = 'starter-1';
assert.throws(
  () => commitShowdownTerminalResult(duplicatePersistent, result([
    resolved('starter-1', 'Pikachu'),
    resolved('starter-2', 'Eevee'),
  ], 'duplicate-persistent')),
  /Duplicate persistent Mapless member id/,
  'persistent identity ambiguity must fail before any commit',
);

const missingPersistentId = stateWithParty();
delete missingPersistentId.party[1].id;
assert.throws(
  () => commitShowdownTerminalResult(missingPersistentId, result([
    resolved('starter-1', 'Pikachu'),
    resolved('starter-2', 'Eevee'),
  ], 'missing-persistent-id')),
  /stable persistent Mapless member id/,
  'species fallback must not stand in for stable persistent identity at terminal commit',
);

console.log('reconstruction showdown terminal party identity smoke: ok');
