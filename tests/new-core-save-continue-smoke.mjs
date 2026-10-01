import assert from 'node:assert/strict';
import { createInitialGameState } from '../src-next/core/game-state.js';
import { step } from '../src-next/core/step.js';
import { serializeNewCoreSave, restoreNewCoreSave } from '../src-next/core/persistence.js';

let state = createInitialGameState({
  runId: 'save-smoke',
  seed: 108,
  party: [{ id: 'p1', species: 'PIKACHU', level: 10, hp: 20, maxhp: 35, exp: 0, moves: [{ id: 'THUNDERSHOCK', pp: 29, maxpp: 30 }] }],
});
state = step(state, { type: 'GENERATE_DAY_BOARD' }).state;
const wildSlot = state.board.findIndex((slot) => slot.kind === 'wild');
assert.ok(wildSlot >= 0);
state = step(state, { type: 'BOARD_ENCOUNTER_READY', slot: wildSlot, encounter: { species: 'TEST_FOE', level: 10, baseExp: 70 } }).state;
const pending = step(state, { type: 'BOARD_SELECT', slot: wildSlot }).state;
const terminal = step(pending, {
  type: 'BATTLE_TERMINAL_RESULT',
  battleId: pending.activeBattle.id,
  resultId: 'result-1',
  outcome: 'win',
});
assert.equal(terminal.effects.length, 0);
const rewarded = step(terminal.state, {
  type: 'BATTLE_REWARD_RESULT',
  rewardId: terminal.state.pendingBattleResult.rewardId,
  recipientIds: ['p1'],
});
assert.equal(rewarded.effects.filter((effect) => effect.type === 'REQUEST_SAVE').length, 1);
assert.equal(rewarded.state.party[0].exp, 50);
assert.equal(rewarded.state.bag.items.POTION, 1);
const advance = step(rewarded.state, { type: 'ADVANCE_DAY', transitionId: 'day-1-next', confirmed: true });
assert.equal(advance.state.day, 2);
assert.equal(advance.state.mode, 'board_pending');
assert.equal(advance.effects.filter((effect) => effect.type === 'REQUEST_SAVE').length, 1);
const day2 = step(advance.state, { type: 'GENERATE_DAY_BOARD' }).state;
const serialized = serializeNewCoreSave(day2);
const restored = restoreNewCoreSave(serialized);
assert.deepEqual(restored, day2);
assert.equal(restored.day, 2);
assert.equal(restored.boardSelectionsRemaining, 8);
assert.equal(restored.money, 0);
assert.equal(restored.party[0].exp, 50);
assert.equal(restored.bag.items.POTION, 1);
assert.deepEqual(restored.diagnostics.appliedResultIds, ['result-1']);
assert.deepEqual(restored.diagnostics.appliedRewardIds, ['result-1:reward']);
assert.deepEqual(restored.diagnostics.appliedDayTransitionIds, ['day-1-next']);
const rewardReplay = step(restored, { type: 'BATTLE_REWARD_RESULT', rewardId: 'result-1:reward', recipientIds: ['p1'] });
assert.deepEqual(rewardReplay.state, restored);
const dayReplay = step(restored, { type: 'ADVANCE_DAY', transitionId: 'day-1-next', confirmed: true });
assert.equal(dayReplay.state.day, 2);
assert.deepEqual(dayReplay.state, restored);
assert.throws(() => restoreNewCoreSave(JSON.stringify({ format: 'mapless-new-core', schemaVersion: 999, state: restored })), /schema/);
console.log('new-core-save-continue-smoke: ok');
