import assert from 'node:assert/strict';
import { createInitialGameState } from '../src-next/core/game-state.js';
import { step } from '../src-next/core/step.js';
import {
  createPresentationQueue,
  enqueuePresentationEvents,
  snapshotPresentationQueue,
} from '../src-next/presentation/semantic-event-queue.js';

const slots = Array.from({ length: 8 }, (_, index) => index === 0
  ? { kind: 'wild', encounter: { species: 'RATTATA' } }
  : { kind: 'event' });
let state = createInitialGameState({
  runId: 'p1-presentation',
  party: [{ id: 'starter', species: 'PIKACHU', hp: 35, maxhp: 35, exp: 0 }],
});
state = step(state, { type: 'BOARD_GENERATED', slots }).state;
state = step(state, { type: 'BOARD_SELECT', slot: 0 }).state;
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
  money: 10,
  partyExp: [{ memberId: 'starter', exp: 5 }],
});

assert.ok(terminal.events.some((event) => event.type === 'BATTLE_WON'));
assert.ok(reward.events.some((event) => event.type === 'EXP_GAINED' && event.memberId === 'starter' && event.amount === 5));

const queue = createPresentationQueue();
enqueuePresentationEvents(queue, [...terminal.events, ...reward.events]);
const snapshot = snapshotPresentationQueue(queue);
const byType = new Map(snapshot.jobs.map((job) => [job.type, job]));
assert.equal(byType.get('BATTLE_WON').message, true);
assert.equal(byType.get('BATTLE_WON').animation, true);
assert.equal(byType.get('EXP_GAINED').message, true);
assert.equal(byType.get('EXP_GAINED').animation, true);
assert.equal(byType.get('BATTLE_REWARD_REQUESTED').message, false, 'control events stay presentation-inert');
assert.equal(byType.get('BOARD_RETURNED').animation, false, 'scene navigation remains outside battle animation truth');
console.log('new-core P1 presentation handoff: ok');
