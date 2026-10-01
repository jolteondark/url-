import assert from 'node:assert/strict';
import {
  MAPLESS_GENERAL_TYPES,
  generateCanonicalDayBoard,
  wildTypeForDayOrdinal,
} from '../src-next/core/board/canonical-day-board.js';

assert.deepEqual(MAPLESS_GENERAL_TYPES, [
  'BUG','DARK','DRAGON','ELECTRIC','FAIRY','FIGHTING','FIRE','FLYING','GHOST',
  'GRASS','GROUND','ICE','NORMAL','POISON','PSYCHIC','ROCK','STEEL','WATER',
]);
assert.equal(wildTypeForDayOrdinal(1, 0), 'BUG');
assert.equal(wildTypeForDayOrdinal(1, 1), 'DARK');
assert.equal(wildTypeForDayOrdinal(2, 0), 'DRAGON');
assert.equal(wildTypeForDayOrdinal(2, 1), 'ELECTRIC');
assert.equal(wildTypeForDayOrdinal(10, 0), 'BUG', '18-type rotation wraps after nine days');
for (const day of [1,2,5,9,10,20]) {
  const board = generateCanonicalDayBoard(108, day);
  const wilds = board.slots.filter((slot) => slot.kind === 'wild');
  wilds.forEach((slot, ordinal) => assert.equal(slot.type, wildTypeForDayOrdinal(day, ordinal)));
}
console.log('New Core ordinary wild type rotation matches Safari owner: ok');
