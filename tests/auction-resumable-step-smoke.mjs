import assert from 'node:assert/strict';
import { resolveAuctionProduct, resolveAuctionProductStep } from '../runtime/mapless-auction-flow.js';

function product(overrides = {}) {
  return {
    item: 'NUGGET',
    price: 1000,
    fair: 1200,
    fake: false,
    npc_limits: [1500],
    npc_active: [true],
    ...overrides,
  };
}

{
  const result = resolveAuctionProductStep(product(), { money: 5000 });
  assert.equal(result.awaiting_choice, true);
  assert.equal(result.won, false);
  assert.equal(result.product.price, 1000);
  assert.deepEqual(result.operations, []);
}

{
  const first = resolveAuctionProductStep(product(), { money: 5000, choice: 0 });
  assert.equal(first.awaiting_choice, true);
  assert.equal(first.won, false);
  assert.equal(first.product.price, 1200);
  assert.deepEqual(first.operations.map((op) => op.op), ['choice', 'auction_bid', 'npc_bid']);

  const second = resolveAuctionProductStep(first.product, { money: 5000, choice: 0 });
  assert.equal(second.awaiting_choice, true);
  assert.equal(second.product.price, 1500);

  const third = resolveAuctionProductStep(second.product, { money: 5000, choice: 0 });
  assert.equal(third.awaiting_choice, false);
  assert.equal(third.won, true);
  assert.equal(third.money_spent, 1650);
  assert.deepEqual(third.granted_items, ['NUGGET']);
}

{
  const result = resolveAuctionProductStep(product(), { money: 1000, choice: 0 });
  assert.equal(result.awaiting_choice, true);
  assert.equal(result.won, false);
  assert.equal(result.product.price, 1000);
  assert.equal(result.operations.at(-1).op, 'message');
}

{
  const result = resolveAuctionProductStep(product(), { money: 5000, choice: 2 });
  assert.equal(result.awaiting_choice, false);
  assert.equal(result.won, false);
  assert.deepEqual(result.operations.map((op) => op.op), ['choice']);
}

{
  const result = resolveAuctionProduct(product(), { money: 5000, choices: [] });
  assert.equal(result.won, false);
  assert.equal(result.operations[0].op, 'choice');
  assert.equal(result.operations[0].result, 2);
}

{
  const result = resolveAuctionProduct(product({ npc_limits: [], npc_active: [], fake: true }), { money: 5000, choices: [0] });
  assert.equal(result.won, true);
  assert.equal(result.money_spent, 1100);
  assert.deepEqual(result.granted_items, []);
  assert.equal(result.operations.at(-1).op, 'trap_reveal');
}

{
  const result = resolveAuctionProduct(product({ npc_limits: [], npc_active: [] }), {
    money: 5000,
    choices: [0],
    can_add_items_result: false,
  });
  assert.equal(result.won, false);
  assert.equal(result.money_spent, 0);
  assert.equal(result.operations.at(-1).op, 'refund_money');
}

console.log('auction resumable-step smoke: ok');
