import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-miner-interaction.js", import.meta.url), "utf8");

assert.match(source, /function operationsRequestSave\(operations = \[\]\)/, "Miner should derive save intent from emitted operations");
assert.match(source, /persistenceRequested:operationsRequestSave\(state\.last_operations\)/, "resolved Miner routes should project request_save as the persistence signal");
assert.doesNotMatch(source, /persistenceRequested:true/, "Miner must not keep an independent persistence boolean truth");
assert.match(source, /\{ op:"request_save", reason:"miner_attempt" \}/, "resolved Miner attempts should still hand off save intent to shared persistence");

console.log("miner owner-persistence smoke: ok");
