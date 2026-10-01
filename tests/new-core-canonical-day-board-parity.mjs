import assert from 'node:assert/strict';
import { generateCanonicalDayBoard as generateNext } from '../src-next/core/board/canonical-day-board.js';
import { generateCanonicalDayBoardV108 } from '../runtime/mapless-canonical-board-generation-v108.js';

for (const seed of [0, 1, 108, 4242, 0xffffffff]) {
  const next = generateNext(seed, 1);
  const legacy = generateCanonicalDayBoardV108({
    day: 1,
    extraRolls: [...next.decisions.extraRolls],
    shuffleOrder: [...next.decisions.shuffleOrder],
  });
  assert.deepEqual(next.slots.map((slot) => slot.kind), legacy.board_kinds, `seed ${seed}`);
  assert.deepEqual([...next.decisions.selectedExtraKinds], legacy.selected_extra_kinds, `selected extras seed ${seed}`);
  assert.equal(next.slots.filter((slot) => slot.kind === 'next_day').length, 1);
  assert.ok(next.slots.some((slot) => slot.kind === 'wild'));
  assert.ok(next.slots.some((slot) => slot.kind === 'trainer'));
}
const repeat = generateNext(108, 1);
assert.deepEqual(generateNext(108, 1), repeat, 'same RNG state must replay the same board');
console.log('New Core canonical Day Board matches v0.9.108 rule oracle: ok');
