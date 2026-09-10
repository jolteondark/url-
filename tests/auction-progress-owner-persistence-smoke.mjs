import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-auction-interaction.js", import.meta.url), "utf8");

assert.match(
  source,
  /function requestsPersistence\(operations\)[\s\S]*?operation\?\.op === "request_save"/,
  "Auction persistence must project from committed request_save operations",
);
assert.match(
  source,
  /\.\.\.\(!blocked \? \[\{ op:"request_save", reason:"auction_progress" \}\] : \[\]\)/,
  "successful resumable bids must request shared persistence",
);
assert.match(
  source,
  /result:blocked \? "insufficient_money" : "awaiting_choice"[\s\S]*?persistenceRequested:requestsPersistence\(state\.last_operations\)/,
  "insufficient-money retries must remain non-persistent while successful bid progress follows owner operations",
);
assert.match(
  source,
  /\{ op:"request_save", reason:"auction_progress" \}[\s\S]*?result:refunded \? "refunded_next_product" : "next_product"[\s\S]*?persistenceRequested:requestsPersistence\(state\.last_operations\)/,
  "advancing to the next auction product must derive persistence from canonical auction progress operations",
);
assert.match(
  source,
  /\{ op:"request_save", reason:"auction_resolved" \}[\s\S]*?persistenceRequested:requestsPersistence\(state\.last_operations\)/,
  "terminal auction completion must derive persistence from its existing save request",
);
assert.doesNotMatch(
  source,
  /persistenceRequested:true/,
  "Auction adapter must not keep a second fixed persistence truth",
);

console.log("auction progress owner persistence smoke: ok");
