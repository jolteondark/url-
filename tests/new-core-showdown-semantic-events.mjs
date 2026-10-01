import assert from 'node:assert/strict';
import { projectShowdownRoundSemanticEvents } from '../src-next/core/battle/showdown-semantic-events.js';

const before = {
  terminal: false,
  p1: [{ maplessId: 'p1', hp: 20, status: '', heldItem: 'oranberry', fainted: false, moves: [{ id: 'tackle', pp: 35, maxpp: 35 }] }],
  p2: [{ maplessId: 'p2', hp: 12, status: '', heldItem: '', fainted: false, moves: [{ id: 'poisonsting', pp: 35, maxpp: 35 }] }],
};
const after = {
  terminal: true,
  p1: [{ maplessId: 'p1', hp: 17, status: 'psn', heldItem: '', fainted: false, moves: [{ id: 'tackle', pp: 34, maxpp: 35 }] }],
  p2: [{ maplessId: 'p2', hp: 0, status: '', heldItem: '', fainted: true, moves: [{ id: 'poisonsting', pp: 34, maxpp: 35 }] }],
};
const events = projectShowdownRoundSemanticEvents(before, after, { playerMoveSlot: 1, foeMoveSlot: 1 });
assert.deepEqual(events, [
  { type: 'MOVE_USED', side: 'player', moveId: 'tackle' },
  { type: 'MOVE_USED', side: 'foe', moveId: 'poisonsting' },
  { type: 'DAMAGE_APPLIED', side: 'player', hpBefore: 20, hpAfter: 17, amount: 3 },
  { type: 'DAMAGE_APPLIED', side: 'foe', hpBefore: 12, hpAfter: 0, amount: 12 },
  { type: 'STATUS_APPLIED', side: 'player', status: 'psn' },
  { type: 'ITEM_TRIGGERED', side: 'player', itemId: 'oranberry', consumed: true },
  { type: 'POKEMON_FAINTED', side: 'foe', maplessId: 'p2' },
]);
assert.equal(events.some((event) => event.type === 'BATTLE_WON'), false, 'terminal outcome remains owned by Core result commit');
console.log('Showdown round semantic event projection: ok');
