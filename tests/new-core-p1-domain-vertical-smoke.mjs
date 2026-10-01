import assert from 'node:assert/strict';
import { createInitialGameState } from '../src-next/core/game-state.js';
import { serializeNewCoreSave, restoreNewCoreSave } from '../src-next/core/persistence.js';
import { step } from '../src-next/core/step.js';

let state = createInitialGameState({
  runId: 'p1-vertical',
  seed: 108,
  money: 25,
  party: [{ id: 'starter', species: 'PIKACHU', level: 10, hp: 35, maxhp: 35, exp: 100 }],
});
state = step(state, { type: 'GENERATE_DAY_BOARD' }).state;
assert.equal(state.board.length, 8);
assert.equal(state.board.filter((slot) => slot.kind === 'next_day').length, 1);
const wildSlot = state.board.findIndex((slot) => slot.kind === 'wild');
assert.ok(wildSlot >= 0);
state = step(state, { type: 'BOARD_ENCOUNTER_READY', slot: wildSlot, encounter: { species: 'TEST_FOE', level: 10, baseExp: 70 } }).state;
state = step(state, { type: 'BOARD_SELECT', slot: wildSlot }).state;
const battleId = state.activeBattle.id;
const terminal = step(state, { type: 'BATTLE_TERMINAL_RESULT', battleId, resultId: 'battle-result-1', outcome: 'win' });
assert.equal(terminal.state.mode, 'battle_result');
assert.equal(terminal.state.board[wildSlot].consumed, true);
assert.equal(terminal.events.at(-1).type, 'BATTLE_REWARD_REQUESTED');
const rewardId = terminal.state.pendingBattleResult.rewardId;
const reward = step(terminal.state, { type: 'BATTLE_REWARD_RESULT', rewardId, recipientIds: ['starter'] });
assert.equal(reward.state.money, 25, 'ordinary wild victory does not grant prize money');
assert.equal(reward.state.party[0].exp, 150);
assert.equal(reward.state.bag.items.POTION, 1);
assert.equal(reward.events.at(-1).type, 'BOARD_RETURNED');
assert.deepEqual(reward.effects, [{ type: 'REQUEST_SAVE', reason: 'battle_reward_result' }]);
const duplicateReward = step(reward.state, { type: 'BATTLE_REWARD_RESULT', rewardId, recipientIds: ['starter'] });
assert.deepEqual(duplicateReward.state, reward.state);
const cancelled = step(reward.state, { type: 'ADVANCE_DAY', transitionId: 'p1-day-1-next', confirmed: false });
assert.equal(cancelled.state.day, 1);
assert.equal(cancelled.effects.length, 0);
const advanced = step(reward.state, { type: 'ADVANCE_DAY', transitionId: 'p1-day-1-next', confirmed: true });
assert.equal(advanced.state.day, 2);
assert.equal(advanced.state.mode, 'board_pending');
assert.equal(advanced.events.at(-1).type, 'BOARD_GENERATION_REQUESTED');
const nextBoard = step(advanced.state, { type: 'GENERATE_DAY_BOARD' }).state;
const continued = restoreNewCoreSave(serializeNewCoreSave(nextBoard));
assert.deepEqual(continued, nextBoard);
assert.equal(continued.day, 2);
assert.equal(continued.money, 25);
assert.equal(continued.party[0].exp, 150);
assert.equal(continued.bag.items.POTION, 1);
assert.equal(continued.diagnostics.appliedRewardIds.includes(rewardId), true);
assert.equal(continued.diagnostics.appliedDayTransitionIds.includes('p1-day-1-next'), true);
console.log('new-core-p1-domain-vertical-smoke: ok');
