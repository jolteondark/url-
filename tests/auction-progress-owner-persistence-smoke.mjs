import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-auction-interaction.js", import.meta.url), "utf8");

assert.match(
  source,
  /\.\.\.\(!blocked \? \[\{ op:"request_save", reason:"auction_progress" \}\] : \[\]\)/,
  "successful resumable bids must request shared persistence",
);
assert.match(
  source,
  /persistenceRequested:!blocked/,
  "insufficient-money retries must remain non-persistent while successful bid progress persists",
);
assert.match(
  source,
  /\{ op:"request_save", reason:"auction_progress" \}[\s\S]*?result:refunded \? "refunded_next_product" : "next_product"[\s\S]*?persistenceRequested:true/,
  "advancing to the next auction product must persist canonical auction progress",
);
assert.match(
  source,
  /\{ op:"request_save", reason:"auction_resolved" \}/,
  "terminal auction completion must keep its existing save request",
);

console.log("auction progress owner persistence smoke: ok");
