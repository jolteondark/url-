import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-miner-interaction.js", import.meta.url), "utf8");

assert.match(source, /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/);
assert.doesNotMatch(source, /runtime\.bag\.slots\s*=/);
assert.doesNotMatch(source, /runtime\.bag\.money\s*=/);
assert.match(source, /commitSafariBagEconomyReceipt\(runtime, \{ reward:transaction \}\)\.success/);
assert.match(source, /commitSafariBagEconomyReceipt\(runtime, \{ moneyDelta:-MAPLESS_MINER_DIG_COST_V108 \}\)/);
assert.match(source, /payment\.operations\.map/);
assert.match(source, /request_save", reason:"miner_attempt"/);

console.log("Miner payment and item rewards use the shared Safari Bag/Economy receipt");
