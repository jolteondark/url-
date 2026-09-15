import assert from 'node:assert/strict';
import { createShowdownTerminalCommitter } from '../src-next/core/battle/showdown-terminal-commit.js';

const original = {
  encounterId: 'enc-1',
  p1: {
    team: [{ id: 'hero-pika', species: 'Pikachu', currentHp: 25, status: '', heldItem: 'Oran Berry', moves: [{ id: 'thundershock', pp: 30 }, { id: 'quickattack', pp: 30 }] }],
  },
  p2: {
    team: [{ id: 'wild-rattata', species: 'Rattata', currentHp: 20, status: '', heldItem: '', moves: [{ id: 'tackle', pp: 35 }] }],
  },
};

const resolved = {
  terminal: true,
  winner: 'Mapless',
  turn: 1,
  p1: [{ maplessId: 'hero-pika', hp: 18, status: 'par', heldItem: '', fainted: false, boosts: { atk: 6 }, moves: [{ id: 'thundershock', pp: 29, maxpp: 30 }, { id: 'quickattack', pp: 30, maxpp: 30 }] }],
  p2: [{ maplessId: 'wild-rattata', hp: 0, status: '', heldItem: '', fainted: true, volatiles: { confusion: {} }, moves: [{ id: 'tackle', pp: 34, maxpp: 35 }] }],
};

const committer = createShowdownTerminalCommitter();
assert.equal(committer.committed, false);
const next = committer.commit(original, resolved);
assert.equal(committer.committed, true);
assert.notEqual(next, original);
assert.equal(original.p1.team[0].currentHp, 25, 'commit must not mutate source Mapless state');
assert.equal(next.p1.team[0].currentHp, 18);
assert.equal(next.p1.team[0].status, 'par');
assert.equal(next.p1.team[0].heldItem, '', 'consumed held item must persist');
assert.equal(next.p1.team[0].moves[0].pp, 29);
assert.equal(next.p2.team[0].currentHp, 0);
assert.equal(next.p2.team[0].moves[0].pp, 34);
assert.equal('boosts' in next.p1.team[0], false, 'stat stages must not persist');
assert.equal('volatiles' in next.p2.team[0], false, 'volatile state must not persist');
assert.throws(() => committer.commit(original, resolved), /already been committed/, 'terminal replay must not double-commit');

const premature = createShowdownTerminalCommitter();
assert.throws(() => premature.commit(original, { ...resolved, terminal: false }), /must be terminal/);
assert.equal(premature.committed, false, 'failed premature commit must not consume exactly-once token');

const missing = createShowdownTerminalCommitter();
assert.throws(() => missing.commit(original, { ...resolved, p1: [] }), /Missing resolved Showdown state/);
assert.equal(missing.committed, false, 'failed projection must remain retryable');

console.log('reconstruction-showdown-terminal-commit-smoke: ok');
