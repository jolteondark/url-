import assert from 'node:assert/strict';
import { createInitialGameState } from '../src-next/core/game-state.js';
import { step } from '../src-next/core/step.js';
import { serializeNewCoreSave, restoreNewCoreSave } from '../src-next/core/persistence.js';

const initial = createInitialGameState({
  runId: 'save-smoke',
  seed: 108,
  party: [{ id: 'p1', species: 'PIKACHU', hp: 20, maxhp: 35, exp: 0, moves: [{ id: 'THUNDERSHOCK', pp: 29, maxpp: 30 }] }],
});
const board = step(initial, {
  type: 'BOARD_GENERATED',
  slots: Array.from({ length: 8 }, (_, i) => ({ kind: 'wild', encounter: { species: i === 0 ? 'RATTATA' : 'PIDGEY' } })),
}).state;
const pending = step(board, { type: 'BOARD_SELECT', slot: 0 }).state;
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
  money: 50,
  partyExp: [{ memberId: 'p1', exp: 7 }],
});
assert.equal(rewarded.effects.filter((effect) => effect.type === 'REQUEST_SAVE').length, 1);
const advance = step(rewarded.state, { type: 'ADVANCE_DAY', transitionId: 'day-1-next', confirmed: true });
assert.equal(advance.state.day, 2);
assert.equal(advance.state.mode, 'board_pending');
assert.equal(advance.effects.filter((effect) => effect.type === 'REQUEST_SAVE').length, 1);
const day2 = step(advance.state, {
  type: 'BOARD_GENERATED',
  slots: Array.from({ length: 8 }, () => ({ kind: 'wild', encounter: { species: 'PIDGEY' } })),
}).state;
const serialized = serializeNewCoreSave(day2);
const restored = restoreNewCoreSave(serialized);
assert.deepEqual(restored, day2);
assert.equal(restored.day, 2);
assert.equal(restored.boardSelectionsRemaining, 8);
assert.equal(restored.money, 50);
assert.equal(restored.party[0].exp, 7);
assert.deepEqual(restored.diagnostics.appliedResultIds, ['result-1']);
assert.deepEqual(restored.diagnostics.appliedRewardIds, ['result-1:reward']);
assert.deepEqual(restored.diagnostics.appliedDayTransitionIds, ['day-1-next']);
const rewardReplay = step(restored, { type: 'BATTLE_REWARD_RESULT', rewardId: 'result-1:reward', money: 999, partyExp: [{ memberId: 'p1', exp: 999 }] });
assert.deepEqual(rewardReplay.state, restored);
const dayReplay = step(restored, { type: 'ADVANCE_DAY', transitionId: 'day-1-next', confirmed: true });
assert.equal(dayReplay.state.day, 2);
assert.deepEqual(dayReplay.state, restored);
assert.throws(() => restoreNewCoreSave(JSON.stringify({ format: 'mapless-new-core', schemaVersion: 999, state: restored })), /schema/);
console.log('new-core-save-continue-smoke: ok');
