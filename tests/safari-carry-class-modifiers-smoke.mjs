import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  MAPLESS_CARRY_CLASS_RULES,
  maplessCarryMoneyGain,
  maplessCarrySellPrice,
  safariCarryoverPartyLimit,
} from '../runtime/mapless-carry-class-rules.js';
import { routeCaughtQueueToPartyStorage } from '../runtime/caught-queue-party-storage.js';

assert.equal(MAPLESS_CARRY_CLASS_RULES.general.partyLimit, 6);
assert.equal(MAPLESS_CARRY_CLASS_RULES.pseudo_final.partyLimit, 6);
assert.equal(safariCarryoverPartyLimit('special'), 5);
assert.equal(safariCarryoverPartyLimit('legend'), 5);
assert.equal(maplessCarryMoneyGain(1001, 'general'), 1001);
assert.equal(maplessCarryMoneyGain(1001, 'pseudo_final'), 1001);
assert.equal(maplessCarryMoneyGain(1001, 'special'), 900);
assert.equal(maplessCarryMoneyGain(1001, 'legend'), 800);
assert.equal(maplessCarrySellPrice(101, 'general'), 101);
assert.equal(maplessCarrySellPrice(101, 'pseudo_final'), 101);
assert.equal(maplessCarrySellPrice(101, 'special'), 85);
assert.equal(maplessCarrySellPrice(101, 'legend'), 65);

function routeSixth(carryClass) {
  const party = Array.from({ length: 5 }, (_, index) => ({ species: `P${index}`, hp: 1, max_hp: 1, moves: [] }));
  const boxes = [{ name: 'Box 1', capacity: 30, slots: [] }];
  return routeCaughtQueueToPartyStorage({ party, boxes, currentBox: 0 }, [{ species: 'CAUGHT', hp: 1, max_hp: 1, moves: [] }], {
    maxPartySize: safariCarryoverPartyLimit(carryClass),
  });
}

for (const carryClass of ['special', 'legend']) {
  const routed = routeSixth(carryClass);
  assert.equal(routed.state.party.length, 5, `${carryClass} must keep party at five`);
  assert.equal(routed.routed[0].result, 'stored');
  assert.equal(routed.state.boxes[0].slots[0].species, 'CAUGHT');
}

const prepareSource = fs.readFileSync(new URL('../runtime/mapless-carryover-next-run.js', import.meta.url), 'utf8');
assert.doesNotMatch(prepareSource, /const\s+CLASS_RULES\s*=/, '#272 prepare must not own a second carry-class truth');
assert.match(prepareSource, /maplessCarryClassRule/);
assert.match(prepareSource, /maplessCarryStartingMoney/);

const trainerSource = fs.readFileSync(new URL('../runtime/safari-normal-battle-finalize.js', import.meta.url), 'utf8');
assert.match(trainerSource, /maplessCarryMoneyGain\(requested, carryClass\)/);
const bountySource = fs.readFileSync(new URL('../runtime/safari-playable-integration.js', import.meta.url), 'utf8');
assert.match(bountySource, /maplessCarryMoneyGain\(requestedReward, carryClass\)/);
const shopSource = fs.readFileSync(new URL('../runtime/safari-village-fixed-shop-integration.js', import.meta.url), 'utf8');
assert.match(shopSource, /transactionKind !== 'sell'/, 'purchase path must remain unmodified');
assert.match(shopSource, /maplessCarrySellPrice\(baseUnitPrice, carryClass\)/);
const captureSource = fs.readFileSync(new URL('../runtime/safari-normal-battle-lifecycle.js', import.meta.url), 'utf8');
assert.match(captureSource, /maxPartySize: partyLimit/);

console.log(JSON.stringify({
  ok: true,
  special: { partyLimit: 5, money1001: 900, sell101: 85 },
  legend: { partyLimit: 5, money1001: 800, sell101: 65 },
  sixthCaptureStored: true,
  sharedRuleOwner: true,
}));
