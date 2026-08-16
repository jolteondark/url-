import assert from 'node:assert/strict';
import { prepareSafariNormalEventV108 } from '../runtime/mapless-normal-event-v108-preparation.js';
import {
  createSafariPlayableRuntime,
  resolveSafariMachineGachaInteraction,
} from '../runtime/safari-playable-integration.js';

const prepared = prepareSafariNormalEventV108(
  { kind: 'normal_event', normal_event_id: 'machine_gacha', normal_seed: 54321, normal_data: {} },
  { day: 4, index: 2, partyFull: false },
);
assert.equal(prepared.normal_event_id, 'machine_gacha');
assert.equal(prepared.normal_data.machine_stock.length, 100);
assert.equal(new Set(prepared.normal_data.machine_stock).size, 100);
assert.equal(prepared.normal_data.machine_index, 0);

const runtime = createSafariPlayableRuntime();
runtime.bag.money = 5000;
runtime.variables.mapless.board_events[0] = prepared;
runtime.variables.mapless.board_revealed[0] = false;
runtime.variables.mapless.board_consumed[0] = false;
const result = resolveSafariMachineGachaInteraction(runtime, 0, ['buy', 'buy', 'leave']);
assert.equal(result.draws, 2);
assert.equal(result.rewards.length, 2);
assert.notEqual(result.rewards[0], result.rewards[1]);
assert.equal(runtime.bag.money, 2000);
assert.equal(runtime.variables.mapless.board_consumed[0], true);
assert.equal(runtime.variables.mapless.board_events[0].normal_resolved, true);
assert.equal(runtime.variables.mapless.board_events[0].normal_data.machine_index, 2);
assert.equal(runtime.bag.slots.reduce((sum, slot) => sum + Number(slot?.[1] ?? 0), 0), 2);

console.log('Safari machine gacha playable smoke: PASS');
