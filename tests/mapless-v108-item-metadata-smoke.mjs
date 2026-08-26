import assert from "node:assert/strict";
import { maplessV108ItemMetadata } from "../runtime/mapless-v108-item-metadata.js";

function offerable(itemId) {
  const meta = maplessV108ItemMetadata(itemId);
  return Boolean(meta && !meta.keyItem && !meta.machine && (meta.berry || meta.price > 0));
}

assert.equal(offerable("HYPERCHERIBERRY"), true, "zero-price berry remains offerable");
assert.equal(offerable("POTION"), true, "priced ordinary item remains offerable");
assert.equal(offerable("BICYCLE"), false, "key item must be rejected");
assert.equal(offerable("TM01"), false, "machine must be rejected");
assert.equal(offerable("MASTERBALL"), false, "zero-price non-berry must be rejected");
assert.equal(maplessV108ItemMetadata("NO_SUCH_ITEM"), null, "unknown ids must not be guessed");

console.log("v0.9.108 item metadata smoke passed");
