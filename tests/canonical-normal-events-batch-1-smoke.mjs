import assert from 'node:assert/strict';
import { resolveWishingFountain } from '../runtime/mapless-wishing-fountain-flow.js';
import { resolveDayBoardWishingFountain } from '../runtime/mapless-day-board-wishing-fountain.js';
import { resolveTrainerCamp } from '../runtime/mapless-trainer-camp-flow.js';
import { resolveTravelingCook } from '../runtime/mapless-traveling-cook-flow.js';

const fountainEvent = { kind:'normal_event', normal_event_id:'wishing_fountain', normal_seed:7, normal_data:{ small_roll:20, large_roll:50, reach_roll:35, bonus_stat:'ATTACK' } };
const small = resolveWishingFountain({ event:fountainEvent, action:'small_wish', spend_result:true });
assert.equal(small.result, true);
assert.equal(small.outcome, 'small_heal');
assert.equal(small.money_delta, -200);
assert.equal(small.party_mutated, true);

const board = resolveDayBoardWishingFountain({
  board:{ index:0, board_events:[structuredClone(fountainEvent)], board_visited:[false], board_revealed:[false], board_consumed:[false], pending_hatches:['EGG1'], autosave_defined:true, event_stage_active:true, scene_same:true },
  fountain:{ action:'reach', scaling_value:2 },
});
assert.equal(board.result, true);
assert.equal(board.fountain.outcome, 'reach_money');
assert.equal(board.fountain.money_delta, 800);
assert.equal(board.board.state.board_consumed[0], true);
assert.equal(board.board.operations.some(x=>x.op==='hatch_pending'), true);

const camp = resolveTrainerCamp({
  event:{ normal_data:{ task:'cooking', manual_fail:false } },
  suitable_type:'FIRE', action:'type', chosen_pokemon:'CHARMANDER', current_day:4,
});
assert.equal(camp.result, true);
assert.equal(camp.outcome, 'type_help');
assert.equal(camp.heal_requested, true);
assert.equal(camp.reward_requested, true);
assert.equal(camp.exp_requested, true);
assert.equal(camp.operations.find(x=>x.op==='gain_small_exp').amount, 55);

const cook = resolveTravelingCook({
  event:{ normal_data:{ prototype_roll:80 } },
  choice:'paid', meal:'power', scaling_value:3, current_day:5, spend_money_result:true,
});
assert.equal(cook.result, true);
assert.equal(cook.outcome, 'paid_meal');
assert.equal(cook.price, 900);
assert.deepEqual(cook.operations.find(x=>x.op==='set_power_meal'), { op:'set_power_meal', battles:3, day:5 });

const refund = resolveTravelingCook({ event:{ normal_data:{} }, choice:'paid', meal:null, scaling_value:1, spend_money_result:true });
assert.equal(refund.result, false);
assert.equal(refund.outcome, 'meal_cancelled_refunded');
assert.equal(refund.operations.some(x=>x.op==='refund_money' && x.amount===700), true);

console.log(JSON.stringify({ ok:true, fountain:small.outcome, board:board.fountain.outcome, camp:camp.outcome, cook:cook.outcome }));
