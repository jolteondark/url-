import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-wounded-pokemon-integration.js", import.meta.url), "utf8");

assert.match(source, /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/);
assert.match(source, /commitSafariBagEconomyReceipt\(runtime, \{[\s\S]*pockets:\{ general:\{ slots:resolved\.slots \} \}/);
assert.doesNotMatch(source, /runtime\.bag\.slots\s*=/);
assert.match(source, /if \(!routed\.success\)[\s\S]*persistenceRequested: false/);
assert.match(source, /request_save", reason: "wounded_pokemon_resolved"/);

console.log("wounded pokemon shared Bag receipt smoke ok");
