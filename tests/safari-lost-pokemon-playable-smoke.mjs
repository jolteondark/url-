import assert from 'node:assert/strict';
import { resolveSafariLostPokemonInteraction, safariLostPokemonBerryChoices } from '../runtime/safari-lost-pokemon-interaction.js';

function runtime({ joinRoll = 90, searchRoll = 60, slots = [['ORANBERRY', 1]], consumed = false } = {}) {
  return {
    player:{ party:[] },
    bag:{ slots:structuredClone(slots), money:0 },
    storage_system:{ boxes:[Array(30).fill(null)], currentBox:0 },
    variables:{ mapless:{
      day:1,
      location:'day_board',
      mapless_carry_class:'general',
      board_events:[{ kind:'normal_event', normal_event_id:'lost_pokemon', normal_seed:1234, normal_data:{ type:'NORMAL', join_roll:joinRoll, search_roll:searchRoll }, normal_resolved:false }],
      board_revealed:[false], board_visited:[false], board_consumed:[consumed], notice:'', last_operations:[],
    } },
  };
}

{
  const current = runtime();
  assert.deepEqual(safariLostPokemonBerryChoices(current), ['ORANBERRY']);
  const result = await resolveSafariLostPokemonInteraction(current, 0, 'berry:ORANBERRY');
  assert.equal(result.completed, true);
  assert.equal(result.result, 'berry_small_reward');
  assert.equal(current.variables.mapless.board_consumed[0], true);
  assert.equal(current.bag.slots.some(([id]) => id === 'ORANBERRY'), false);
  assert.equal(current.bag.slots.length >= 1, true);
}

{
  const current = runtime({ slots:[] });
  assert.deepEqual(safariLostPokemonBerryChoices(current), []);
  const result = await resolveSafariLostPokemonInteraction(current, 0, 'leave');
  assert.equal(result.completed, true);
  assert.equal(result.result, 'left');
  assert.equal(current.variables.mapless.board_consumed[0], true);
}

{
  const current = runtime({ joinRoll:90 });
  const result = await resolveSafariLostPokemonInteraction(current, 0, 'join');
  assert.equal(result.completed, true);
  assert.equal(result.result, 'join_refused');
  assert.equal(current.variables.mapless.board_consumed[0], true);
}

{
  const current = runtime({ searchRoll:60 });
  const result = await resolveSafariLostPokemonInteraction(current, 0, 'search');
  assert.equal(result.completed, true);
  assert.equal(result.result, 'search_parent');
  assert.equal(current.variables.mapless.board_consumed[0], true);
}

console.log('safari lost pokemon playable smoke: PASS');
