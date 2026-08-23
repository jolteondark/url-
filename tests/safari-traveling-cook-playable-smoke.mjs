import assert from 'node:assert/strict';
import { resolveRewardTransaction } from '../runtime/bag-economy-reward-transaction.js';
import { resolveSafariTravelingCookInteraction, safariTravelingCookBerryCount } from '../runtime/safari-traveling-cook-interaction.js';

function pokemon({ hp = 20, maxHp = 40, status = 'NONE' } = {}) {
  return { species:'EEVEE', level:10, hp, max_hp:maxHp, status, status_count:0, egg:false, moves:[] };
}
function runtime({ roll = 10, slots = [['ORANBERRY', 2], ['PECHABERRY', 1]], party = [pokemon()] } = {}) {
  return {
    player:{ party:structuredClone(party) },
    bag:{ slots:structuredClone(slots), money:2000 },
    variables:{ mapless:{
      day:1, location:'day_board', mapless_run_active:true,
      board_events:[{ kind:'normal_event', normal_event_id:'traveling_cook', normal_seed:77, normal_data:{ prototype_roll:roll }, normal_resolved:false }],
      board_revealed:[false], board_visited:[false], board_consumed:[false], notice:'', last_operations:[],
    } },
  };
}

{
  const transaction = resolveRewardTransaction({
    pockets:{ general:{ slots:[['ORANBERRY', 3]], maxSlots:20, maxPerSlot:99 } },
    itemMeta:{ ORANBERRY:{ valid:true, pocket:'general' } },
    items:[], costs:[{ item:'ORANBERRY', quantity:3 }],
  });
  assert.equal(transaction.success, true);
  assert.equal(transaction.result, 'consumed');
  assert.deepEqual(transaction.consumed, [{ item:'ORANBERRY', quantity:3 }]);
}

{
  const current = runtime();
  assert.equal(safariTravelingCookBerryCount(current), 3);
  const result = resolveSafariTravelingCookInteraction(current, 0, 'berries', 'heal');
  assert.equal(result.completed, true);
  assert.equal(result.result, 'berries_heal');
  assert.equal(current.variables.mapless.board_consumed[0], true);
  assert.equal(safariTravelingCookBerryCount(current), 0);
  assert.equal(current.player.party[0].hp > 20, true);
}

{
  const current = runtime({ slots:[['ORANBERRY', 2]] });
  const before = structuredClone(current.bag.slots);
  const result = resolveSafariTravelingCookInteraction(current, 0, 'berries', 'medicine');
  assert.equal(result.completed, false);
  assert.equal(result.result, 'not_enough_berries');
  assert.deepEqual(current.bag.slots, before);
  assert.equal(current.variables.mapless.board_consumed[0], false);
}

{
  const current = runtime({ roll:10 });
  const result = resolveSafariTravelingCookInteraction(current, 0, 'prototype');
  assert.equal(result.completed, true);
  assert.equal(result.result, 'prototype_heal');
  assert.equal(current.player.party[0].hp > 20, true);
}

{
  const current = runtime({ roll:70 });
  const result = resolveSafariTravelingCookInteraction(current, 0, 'prototype');
  assert.equal(result.completed, false);
  assert.equal(result.result, 'power_meal_owner_missing');
  assert.equal(current.variables.mapless.board_consumed[0], false);
}

{
  const current = runtime({ roll:90 });
  const result = resolveSafariTravelingCookInteraction(current, 0, 'prototype');
  assert.equal(result.completed, true);
  assert.equal(result.result, 'prototype_confusion');
  assert.equal(current.player.party[0].mapless_overworld_confusion, true);
}

{
  const current = runtime({ roll:99, party:[pokemon({ hp:20 }), pokemon({ hp:30 })] });
  const result = resolveSafariTravelingCookInteraction(current, 0, 'prototype');
  assert.equal(result.completed, true);
  assert.equal(result.result, 'prototype_damage');
  assert.equal(current.player.party[0].hp, 10);
  assert.equal(current.player.party[1].hp, 20);
}

console.log('safari traveling cook playable smoke: PASS');
