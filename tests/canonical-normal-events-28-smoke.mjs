import assert from 'node:assert/strict';
import {
  CANONICAL_NORMAL_EVENT_IDS,
  CANONICAL_NORMAL_EVENT_SELECTABLE_IDS,
  CANONICAL_NORMAL_EVENT_SPECIAL_IDS,
  canonicalNormalEventRegistry,
  hasCanonicalNormalEvent,
  resolveCanonicalNormalEvent,
} from '../runtime/mapless-canonical-normal-event-dispatcher.js';

assert.equal(CANONICAL_NORMAL_EVENT_IDS.length, 28);
assert.equal(CANONICAL_NORMAL_EVENT_SELECTABLE_IDS.length, 26);
assert.deepEqual(CANONICAL_NORMAL_EVENT_SPECIAL_IDS, ['treasure_map_result', 'bounty_target']);
assert.equal(new Set(CANONICAL_NORMAL_EVENT_IDS).size, 28);
assert.equal(canonicalNormalEventRegistry().filter(x => x.special).length, 2);
for (const id of CANONICAL_NORMAL_EVENT_IDS) assert.equal(hasCanonicalNormalEvent(id), true, id);
assert.equal(hasCanonicalNormalEvent('not_canonical'), false);

const cases = [
  ['flooded_river', { event:{normal_data:{}}, action:'leave' }],
  ['meteor_fragment', { event:{normal_data:{}}, action:'leave' }],
  ['pokemon_nest', { event:{normal_data:{}}, action:'observe', current_day:3 }],
  ['street_performer', { event:{normal_data:{}}, action:'leave' }],
  ['lost_bag', { event:{normal_data:{}}, choice:'leave' }],
  ['berry_juice_shop', { event:{normal_data:{}}, attempts:[{choice:'leave'}] }],
  ['old_statue', { event:{normal_data:{}}, choice:'leave' }],
  ['auction', { event:{normal_data:{products:[],won:false}}, data:{products:[],won:false} }],
  ['treasure_map_seller', { event:{normal_data:{}}, existing_treasure_map:true }],
  ['crumbling_bridge', { event:{normal_data:{}}, action:'leave' }],
];
for (const [id,input] of cases) {
  const result = resolveCanonicalNormalEvent(id,input);
  assert.equal(result.event_id,id);
  assert.equal(result.result,true,id);
  assert.equal(result.event.normal_resolved,true,id);
}
const unsupported = resolveCanonicalNormalEvent('not_canonical', {event:{}});
assert.equal(unsupported.result,false);
assert.equal(unsupported.outcome,'unsupported_event');
console.log(JSON.stringify({ok:true,total:28,selectable:26,special:2,smoked:cases.length}));
