import assert from 'node:assert/strict';
import { createInitialGameState } from '../src-next/core/game-state.js';
import { step } from '../src-next/core/step.js';

const slots = Array.from({ length: 8 }, (_, index) => index === 0
  ? { kind: 'wild', encounter: { species: 'TEST_FOE', level: 10, baseExp: 70 } }
  : { kind: 'event' });
let state = createInitialGameState({
  runId: 'p1-capacity',
  bag: { items: { OTHER: 1 }, maxSlots: 1, maxPerSlot: 99 },
  party: [{ id: 'starter', species: 'PIKACHU', level: 10, hp: 35, maxhp: 35, exp: 0 }],
});
state = step(state, { type: 'BOARD_GENERATED', slots }).state;
state = step(state, { type: 'BOARD_SELECT', slot: 0 }).state;
const battleId = state.activeBattle.id;
const terminal = step(state, { type: 'BATTLE_TERMINAL_RESULT', battleId, resultId: 'capacity-result', outcome: 'win' }).state;
const before = structuredClone(terminal);
assert.throws(
  () => step(terminal, { type: 'BATTLE_REWARD_RESULT', rewardId: terminal.pendingBattleResult.rewardId, recipientIds: ['starter'] }),
  /no free slot/
);
assert.deepEqual(terminal, before, 'failed reward preflight must not mutate the input state');
console.log('New Core battle reward capacity fails closed: ok');
