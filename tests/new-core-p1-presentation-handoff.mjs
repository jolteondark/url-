import assert from 'node:assert/strict';
import { createInitialGameState } from '../src-next/core/game-state.js';
import { step } from '../src-next/core/step.js';
import {
  createPresentationQueue,
  enqueuePresentationEvents,
  snapshotPresentationQueue,
} from '../src-next/presentation/semantic-event-queue.js';

let state = createInitialGameState({
  runId: 'p1-presentation',
  seed: 108,
  party: [{ id: 'starter', species: 'PIKACHU', level: 10, hp: 35, maxhp: 35, exp: 0 }],
});
state = step(state, { type: 'GENERATE_DAY_BOARD' }).state;
const wildSlot = state.board.findIndex((slot) => slot.kind === 'wild');
state = step(state, { type: 'BOARD_ENCOUNTER_READY', slot: wildSlot, encounter: { species: 'TEST_FOE', level: 10, baseExp: 70 } }).state;
state = step(state, { type: 'BOARD_SELECT', slot: wildSlot }).state;
const battleId = state.activeBattle.id;
const terminal = step(state, {
  type: 'BATTLE_TERMINAL_RESULT',
  battleId,
  resultId: 'presentation-terminal',
  outcome: 'win',
});
const reward = step(terminal.state, {
  type: 'BATTLE_REWARD_RESULT',
  rewardId: terminal.state.pendingBattleResult.rewardId,
  recipientIds: ['starter'],
});

assert.ok(terminal.events.some((event) => event.type === 'BATTLE_WON'));
assert.ok(reward.events.some((event) => event.type === 'EXP_GAINED' && event.memberId === 'starter' && event.amount === 50));
assert.ok(reward.events.some((event) => event.type === 'ITEM_REWARDED' && event.itemId === 'POTION' && event.quantity === 1));

const queue = createPresentationQueue();
enqueuePresentationEvents(queue, [...terminal.events, ...reward.events]);
const snapshot = snapshotPresentationQueue(queue);
const byType = new Map(snapshot.jobs.map((job) => [job.type, job]));
assert.equal(byType.get('BATTLE_WON').message, true);
assert.equal(byType.get('BATTLE_WON').animation, true);
assert.equal(byType.get('EXP_GAINED').message, true);
assert.equal(byType.get('EXP_GAINED').animation, true);
assert.equal(byType.get('ITEM_REWARDED').message, true);
assert.equal(byType.get('ITEM_REWARDED').animation, true);
assert.equal(byType.get('BATTLE_REWARD_REQUESTED').message, false, 'control events stay presentation-inert');
assert.equal(byType.get('BOARD_RETURNED').animation, false, 'scene navigation remains outside battle animation truth');
console.log('new-core P1 presentation handoff: ok');
