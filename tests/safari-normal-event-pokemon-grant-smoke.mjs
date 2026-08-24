import assert from 'node:assert/strict';
import {
  grantNormalEventHiddenEgg,
  materializeNormalEventHiddenEgg,
} from '../runtime/safari-normal-event-pokemon-grant.js';

function runtime({ party = [], boxes = [Array(30).fill(null)] } = {}) {
  return {
    player:{ party:structuredClone(party) },
    storage_system:{ boxes:structuredClone(boxes), currentBox:0 },
    variables:{ mapless:{ day:12, mapless_carry_class:'general' } },
  };
}

{
  const current = runtime();
  const egg = materializeNormalEventHiddenEgg(current, { type:'NORMAL', seed:991 });
  assert.ok(egg.species);
  assert.equal(egg.steps_to_hatch, 20);
  assert.equal(egg.mapless_hatch_system_version, 918);
  assert.equal(egg.obtain_method, 1);
  assert.equal(Object.hasOwn(egg, 'mapless_egg_shop_bonus_pending'), false);
  assert.equal(Object.hasOwn(egg, 'mapless_egg_shop_day'), false);
}

{
  const current = runtime();
  const result = grantNormalEventHiddenEgg(current, { type:'NORMAL', seed:991 });
  assert.equal(result.success, true);
  assert.equal(result.result, 'party');
  assert.equal(current.player.party.length, 1);
  assert.equal(current.player.party[0].steps_to_hatch, 20);
}

{
  const occupied = Array.from({ length:6 }, (_, index) => ({ species:`P${index}` }));
  const current = runtime({ party:occupied });
  const result = grantNormalEventHiddenEgg(current, { type:'NORMAL', seed:991 });
  assert.equal(result.success, true);
  assert.equal(result.result, 'storage');
  assert.equal(current.player.party.length, 6);
  assert.equal(current.storage_system.boxes[0].filter(Boolean).length, 1);
}

{
  const occupiedParty = Array.from({ length:6 }, (_, index) => ({ species:`P${index}` }));
  const fullBoxes = [Array.from({ length:30 }, (_, index) => ({ species:`B${index}` }))];
  const current = runtime({ party:occupiedParty, boxes:fullBoxes });
  const before = structuredClone(current);
  const result = grantNormalEventHiddenEgg(current, { type:'NORMAL', seed:991 });
  assert.equal(result.success, false);
  assert.equal(result.result, 'full');
  assert.deepEqual(current.player.party, before.player.party);
  assert.deepEqual(current.storage_system.boxes, before.storage_system.boxes);
}

console.log('safari normal-event Pokemon grant smoke: PASS');
