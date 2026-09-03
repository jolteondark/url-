import assert from "node:assert/strict";
import {
  resolveSafariAuctionInteraction,
  safariAuctionPresentation,
} from "../runtime/safari-auction-interaction.js";

function product(overrides = {}) {
  return {
    category:"useful",
    item:"NUGGET",
    fake:false,
    fair:1500,
    price:1000,
    npc_limits:[],
    npc_active:[],
    finished:false,
    ...overrides,
  };
}

function runtime(products, { money = 5000, slots = [] } = {}) {
  return {
    variables:{ mapless:{
      day:1,
      location:"day_board",
      board_events:[{
        kind:"normal_event",
        normal_event_id:"auction",
        normal_data:{ products:structuredClone(products), won:false },
      }],
      board_revealed:[false],
      board_visited:[false],
      board_consumed:[false],
      notice:"",
      last_operations:[],
    } },
    bag:{ money, slots:structuredClone(slots) },
    player:{ party:[] },
  };
}

const three = () => [product(), product({ item:"STARPIECE", price:1200 }), product({ item:"RARECANDY", price:1500 })];

{
  const current = runtime(three());
  const ui = safariAuctionPresentation(current, 0);
  assert.equal(ui.productIndex, 0);
  assert.equal(ui.actions.length, 3);
  assert.deepEqual(ui.actions.map((entry) => entry.id), ["bid_10", "bid_25", "leave"]);
}

{
  const current = runtime(three());
  current.variables.mapless.board_events[0].normal_data.products = [];
  assert.throws(() => safariAuctionPresentation(current, 0), /canonical hydration is missing/);
}

{
  const current = runtime([product({ npc_limits:[2000], npc_active:[true] }), ...three().slice(1)]);
  const result = resolveSafariAuctionInteraction(current, 0, "bid_10");
  assert.equal(result.result, "awaiting_choice");
  assert.equal(result.completed, false);
  assert.equal(current.bag.money, 5000);
  assert.deepEqual(current.bag.slots, []);
  assert.equal(current.variables.mapless.board_consumed[0], false);
  assert.equal(current.variables.mapless.board_events[0].normal_data.products[0].price, 1210);
}

{
  const current = runtime(three(), { money:1000 });
  const before = structuredClone(current.bag);
  const result = resolveSafariAuctionInteraction(current, 0, "bid_10");
  assert.equal(result.result, "insufficient_money");
  assert.equal(result.completed, false);
  assert.deepEqual(current.bag, before);
  assert.equal(current.variables.mapless.board_events[0].normal_data.products[0].price, 1000);
}

{
  const current = runtime(three());
  const result = resolveSafariAuctionInteraction(current, 0, "leave");
  assert.equal(result.result, "next_product");
  assert.equal(result.completed, false);
  assert.equal(current.variables.mapless.board_events[0].normal_data.products[0].finished, true);
  assert.equal(safariAuctionPresentation(current, 0).productIndex, 1);
  assert.equal(current.variables.mapless.board_consumed[0], false);
}

{
  const current = runtime(three(), { slots:Array.from({ length:20 }, (_, index) => [`ITEM${index}`, 99]) });
  const before = structuredClone(current.bag);
  const result = resolveSafariAuctionInteraction(current, 0, "bid_10");
  assert.equal(result.result, "refunded_next_product");
  assert.equal(result.completed, false);
  assert.deepEqual(current.bag, before);
  assert.equal(current.variables.mapless.board_events[0].normal_data.products[0].finished, true);
  assert.equal(current.variables.mapless.board_consumed[0], false);
}

{
  const current = runtime(three());
  const result = resolveSafariAuctionInteraction(current, 0, "bid_10");
  assert.equal(result.result, "purchased");
  assert.equal(result.completed, true);
  assert.equal(current.bag.money, 3900);
  assert.deepEqual(current.bag.slots, [["NUGGET", 1]]);
  assert.equal(current.variables.mapless.board_events[0].normal_data.won, true);
  assert.equal(current.variables.mapless.board_consumed[0], true);
  assert.equal(result.persistenceRequested, true);
  assert.equal(result.operations.filter((operation) => operation.op === "request_save").length, 1);
}

{
  const current = runtime([product({ fake:true }), ...three().slice(1)]);
  const result = resolveSafariAuctionInteraction(current, 0, "bid_10");
  assert.equal(result.result, "fake_won");
  assert.equal(result.completed, true);
  assert.equal(current.bag.money, 3900);
  assert.deepEqual(current.bag.slots, []);
  assert.equal(current.variables.mapless.board_events[0].normal_data.won, true);
  assert.equal(current.variables.mapless.board_consumed[0], true);
}

{
  const current = runtime(three());
  resolveSafariAuctionInteraction(current, 0, "leave");
  resolveSafariAuctionInteraction(current, 0, "leave");
  const result = resolveSafariAuctionInteraction(current, 0, "leave");
  assert.equal(result.completed, true);
  assert.equal(result.result, "auction_left");
  assert.equal(current.variables.mapless.board_consumed[0], true);
  assert.equal(result.operations.filter((operation) => operation.op === "request_save").length, 1);
}

console.log("Safari auction production smoke: ok");
