import assert from 'node:assert/strict';
import { createFreshRunState } from '../src-next/core/run/fresh-start.js';
import { serializeNewCoreSave, restoreNewCoreSave } from '../src-next/core/persistence.js';
import { step } from '../src-next/core/step.js';
import { prepareNewCoreWildBoardSlot } from '../src-next/platform/p1-wild-encounter-driver.js';

const dependencies = {
  encounterRuntime: {
    resolveSafariGeneralEncounter(input) {
      assert.equal(input.requiredType, 'BUG');
      assert.equal(input.speciesIndex, 10);
      assert.equal(input.varianceIndex, 0);
      return {
        required_type: 'BUG',
        species_id: 'SPINARAK',
        species_name: 'Spinarak',
        base_level: 3,
        move_ids: ['POISONSTING'],
        variance: -1,
        min_level: 1,
        max_level: 100,
        resolved_level: 2,
        selection: { species_index: 10, variance_index: 0 },
      };
    },
  },
  speciesMasters: {
    SPINARAK: { id: 'SPINARAK', name: 'Spinarak', base_exp: 50, base_stats: { HP: 40 } },
  },
  moveMasters: {
    POISONSTING: { id: 'POISONSTING', total_pp: 35 },
  },
};

let state = createFreshRunState({ runId: 'p1-vertical', seed: 108 });
assert.equal(state.money, 1000);
assert.equal(state.party[0].species, 'Eevee');
assert.equal(state.party[0].level, 9);
assert.equal(state.party[0].hp, 28);

state = step(state, { type: 'GENERATE_DAY_BOARD' }).state;
assert.equal(state.board.length, 8);
assert.equal(state.board.filter((slot) => slot.kind === 'next_day').length, 1);
const wildSlot = state.board.findIndex((slot) => slot.kind === 'wild');
assert.equal(wildSlot, 2);
assert.equal(state.board[wildSlot].type, 'BUG');

const prepared = await prepareNewCoreWildBoardSlot(state, wildSlot, dependencies);
state = prepared.state;
assert.equal(state.board[wildSlot].encounter.species, 'SPINARAK');
assert.equal(state.board[wildSlot].encounter.level, 2);
assert.equal(state.board[wildSlot].encounter.baseExp, 50);

state = step(state, { type: 'BOARD_SELECT', slot: wildSlot }).state;
const battleId = state.activeBattle.id;
const terminal = step(state, { type: 'BATTLE_TERMINAL_RESULT', battleId, resultId: 'battle-result-1', outcome: 'win' });
assert.equal(terminal.state.mode, 'battle_result');
assert.equal(terminal.state.board[wildSlot].consumed, true);
assert.equal(terminal.events.at(-1).type, 'BATTLE_REWARD_REQUESTED');

const rewardId = terminal.state.pendingBattleResult.rewardId;
const reward = step(terminal.state, { type: 'BATTLE_REWARD_RESULT', rewardId, recipientIds: ['1'] });
assert.equal(reward.state.money, 1000, 'ordinary wild victory does not grant prize money');
assert.equal(reward.state.party[0].exp, 997, 'Lv9 Eevee defeating Lv2 base-Exp-50 foe gains 7 Mapless EXP');
assert.equal(reward.state.bag.items.POTION, 1);
assert.equal(reward.events.at(-1).type, 'BOARD_RETURNED');
assert.deepEqual(reward.effects, [{ type: 'REQUEST_SAVE', reason: 'battle_reward_result' }]);

const duplicateReward = step(reward.state, { type: 'BATTLE_REWARD_RESULT', rewardId, recipientIds: ['1'] });
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
assert.equal(continued.money, 1000);
assert.equal(continued.party[0].exp, 997);
assert.equal(continued.bag.items.POTION, 1);
assert.equal(continued.diagnostics.appliedRewardIds.includes(rewardId), true);
assert.equal(continued.diagnostics.appliedDayTransitionIds.includes('p1-day-1-next'), true);
console.log('new-core-p1-domain-vertical-smoke: ok');
