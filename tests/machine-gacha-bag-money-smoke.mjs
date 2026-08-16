import assert from 'node:assert/strict';
import { resolveMachineGachaBagEconomyIntegration } from '../runtime/bag-economy-machine-gacha-integration.js';

const twoDraws = resolveMachineGachaBagEconomyIntegration({
  event: { normal_data: { machine_stock: ['TM01', 'TR02'], machine_index: 0 } },
  choices: ['buy', 'buy', 'leave'],
  slots: [],
  money: 5000,
  maxSlots: 20,
  maxPerSlot: 99,
  maxMoney: 999999,
});
assert.equal(twoDraws.draws, 2);
assert.equal(twoDraws.money, 2000);
assert.equal(twoDraws.spent, 3000);
assert.deepEqual(twoDraws.slots, [['TM01', 1], ['TR02', 1]]);
assert.equal(twoDraws.facility.event.normal_data.machine_index, 2);

const bagFull = resolveMachineGachaBagEconomyIntegration({
  event: { normal_data: { machine_stock: ['TM01'], machine_index: 0 } },
  choices: ['buy'],
  slots: [['POTION', 99]],
  money: 5000,
  maxSlots: 1,
  maxPerSlot: 99,
  maxMoney: 999999,
});
assert.equal(bagFull.draws, 0);
assert.equal(bagFull.money, 5000);
assert.equal(bagFull.outcome, 'bag_full');
assert.equal(bagFull.facility.event.normal_data.machine_index, 0);

console.log('machine gacha Bag/Money smoke: PASS');
