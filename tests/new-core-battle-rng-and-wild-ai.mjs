import assert from 'node:assert/strict';
import { buildWildMoveChoicesCanonical, resolveEnemyMoveChoiceCanonical } from '../runtime/battle-core-enemy-command-choice.js';
import { drawShowdownBattleSeed, drawWildShowdownMove } from '../src-next/core/battle/battle-rng.js';

const first = drawShowdownBattleSeed(108);
const second = drawShowdownBattleSeed(108);
assert.deepEqual(first, second, 'Showdown seed derivation must replay exactly');
assert.equal(first.seed.length, 4);
first.seed.forEach((part) => assert.ok(Number.isInteger(part) && part >= 0 && part < 0x10000));
assert.notEqual(first.nextRngState, 108);

const moves = [
  { id: 'A', pp: 5 },
  { id: 'B', pp: 0 },
  { id: 'C', pp: 2 },
];
const legal = [{ moveIndex: 0, targetIndex: 0 }, { moveIndex: 2, targetIndex: 0 }];
for (let selected = 0; selected < legal.length; selected += 1) {
  const legacy = resolveEnemyMoveChoiceCanonical({
    choices: buildWildMoveChoicesCanonical(legal),
    skill: 0,
    aiRandomRolls: [selected * 40],
  });
  assert.equal(legacy.command, 'move');
  assert.equal(legacy.moveIndex, legal[selected].moveIndex);
}
const drawn = drawWildShowdownMove(108, moves);
assert.ok([0, 2].includes(drawn.moveIndex));
assert.equal(drawn.moveSlot, drawn.moveIndex + 1);
assert.ok(drawn.nextRngState !== 108);
const struggle = drawWildShowdownMove(108, moves.map((move) => ({ ...move, pp: 0 })));
assert.equal(struggle.command, 'struggle');
assert.equal(struggle.moveSlot, 1);
assert.equal(struggle.nextRngState, 108, 'no random draw is needed when Struggle is forced');
console.log('New Core Showdown seed and wild AI RNG: ok');
