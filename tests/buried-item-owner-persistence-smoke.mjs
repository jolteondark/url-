import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-buried-item-interaction.js", import.meta.url), "utf8");

assert.match(source, /function operationsRequestSave\(operations = \[\]\)/, "Buried Item should derive save intent from emitted operations");
assert.match(source, /\{ op: "request_save", source: "buried_item", index \}/, "resolved Buried Item should emit request_save");
assert.match(source, /persistenceRequested: operationsRequestSave\(state\.last_operations\)/, "Buried Item persistence should project from operations");
assert.doesNotMatch(source, /persistenceRequested: true/, "Buried Item adapter must not keep an independent persistence boolean truth");

console.log("buried item owner-persistence smoke: ok");
