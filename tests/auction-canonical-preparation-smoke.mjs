import assert from "node:assert/strict";
import { prepareAuctionData } from "../runtime/mapless-auction-preparation.js";

function rng(values) {
  let index = 0;
  return (upper) => {
    const value = values[index++];
    if (!Number.isInteger(value) || value < 0 || value >= upper) {
      throw new Error(`bad test roll ${value}/${upper} @${index - 1}`);
    }
    return value;
  };
}

{
  const prices = { POTION:300, SUPERPOTION:700, MASTERBALL:0 };
  const result = prepareAuctionData({
    day:1,
    random_int:rng([
      0, 0, 0, 0, 0,
      91, 0, 20, 1, 70, 0,
      99, 20, 0, 0,
    ]),
    item_exists:() => true,
    item_price:(id) => prices[id] ?? 1000,
  });
  assert.equal(result.products.length, 3);
  assert.deepEqual(result.products[0], {
    category:"useful", item:"POTION", fake:false, fair:500, price:175,
    npc_limits:[375], npc_active:[true], finished:false,
  });
  assert.equal(result.products[1].category, "fake");
  assert.equal(result.products[1].fake, true);
  assert.equal(result.products[1].price, 385);
  assert.equal(result.products[1].npc_limits.length, 2);
  assert.equal(result.products[2].category, "master_ball");
  assert.equal(result.products[2].item, "MASTERBALL");
  assert.equal(result.won, false);
}

{
  const result = prepareAuctionData({
    day:16,
    random_int:rng([50, 0, 0, 0, 0, 50, 0, 0, 0, 0, 50, 0, 0, 0, 0]),
    item_exists:(id) => id === "SUPERPOTION",
    item_price:() => 700,
  });
  assert.ok(result.products.every((product) => product.item === "SUPERPOTION"));
}

{
  const existing = {
    products:[{ item:"NUGGET", npc_limits:[10], npc_active:[true] }, {}, {}],
    won:true,
  };
  let calls = 0;
  const result = prepareAuctionData({
    data:existing,
    random_int:() => { calls += 1; return 0; },
  });
  assert.equal(calls, 0);
  assert.equal(result.won, true);
  assert.notEqual(result.products, existing.products);
}

console.log("auction canonical preparation smoke: ok");
