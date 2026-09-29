import assert from 'node:assert/strict';
import { createShowdownBattleSnapshot } from '../src-next/core/battle/showdown-roundtrip.js';

const snapshot = createShowdownBattleSnapshot({
  party: [{
    id: 'canonical-move-id',
    species: 'Pikachu',
    name: 'Pikachu',
    level: 50,
    hp: 110,
    maxhp: 110,
    status: '',
    heldItem: '',
    fainted: false,
    moves: [{ id: 'Thunder Bolt', pp: 4, maxpp: 24 }],
  }],
}, { battleId: 'canonical-move-id-regression' });

assert.equal(snapshot.party[0].moves[0].id, 'thunderbolt');
assert.equal(snapshot.party[0].moves[0].pp, 4);
assert.equal(snapshot.party[0].moves[0].maxpp, 24);

console.log('reconstruction Showdown canonical starting move id regression PASS');
