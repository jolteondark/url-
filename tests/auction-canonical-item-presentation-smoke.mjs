import assert from "node:assert/strict";
import { resolveCanonicalItemPresentation } from "../runtime/canonical-item-presentation.js";
import { AUCTION_CANONICAL_ITEM_POOLS } from "../runtime/mapless-auction-preparation.js";
import { safariAuctionPresentation } from "../runtime/safari-auction-interaction.js";

const reachableIds = new Set([
  ...AUCTION_CANONICAL_ITEM_POOLS.LOW_ITEMS,
  ...AUCTION_CANONICAL_ITEM_POOLS.MID_ITEMS,
  ...AUCTION_CANONICAL_ITEM_POOLS.LARGE_ITEMS,
  "MASTERBALL",
]);

for (const id of reachableIds) {
  const item = resolveCanonicalItemPresentation(id);
  assert.equal(item.id, id);
  assert.ok(item.name.length > 0, `${id} must have a canonical display name`);
  assert.notEqual(item.name, id, `${id} must not leak its internal identifier to presentation`);
}

assert.equal(resolveCanonicalItemPresentation("POKEBALL").name, "Poké Ball");
assert.equal(resolveCanonicalItemPresentation("ORANBERRY").name, "Oran Berry");
assert.equal(resolveCanonicalItemPresentation("MASTERBALL").name, "Master Ball");
assert.throws(() => resolveCanonicalItemPresentation("NOT_A_CANONICAL_ITEM"), /unknown canonical item presentation id/);

const runtime = {
  bag:{ slots:[], money:5000 },
  variables:{
    mapless:{
      board_events:[{
        kind:"normal_event",
        normal_event_id:"auction",
        normal_data:{
          won:false,
          products:[
            { item:"ORANBERRY", price:500, npc_limits:[], npc_active:[], finished:false },
            { item:"POKEBALL", price:700, npc_limits:[], npc_active:[], finished:false },
            { item:"MASTERBALL", price:1000, npc_limits:[], npc_active:[], finished:false },
          ],
        },
      }],
      board_revealed:[true],
      board_visited:[true],
      board_consumed:[false],
    },
  },
};

const presentation = safariAuctionPresentation(runtime, 0);
assert.equal(presentation.message, "Oran Berryの現在価格は500円です。");
assert.doesNotMatch(presentation.message, /ORANBERRY/);

console.log("auction canonical item presentation smoke: ok");
