import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-tavern-interaction.js", import.meta.url), "utf8");

assert.match(source, /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/);
assert.match(source, /commitSafariBagEconomyReceipt\(runtime, \{ moneyDelta:-legacy\.MAPLESS_TAVERN_REST_COST_V108 \}\)/);
assert.doesNotMatch(source, /runtime\.bag\.money\s*=/);
assert.match(source, /\.\.\.receipt\.operations/);
assert.match(source, /request_save", reason:"tavern_rest"/);
assert.match(source, /persistenceRequested:true/);

console.log("tavern shared economy receipt smoke ok");
