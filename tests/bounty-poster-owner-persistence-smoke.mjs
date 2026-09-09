import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-bounty-poster-interaction.js", import.meta.url), "utf8");

assert.match(source, /function operationsRequestSave\(operations = \[\]\)/, "Bounty Poster should derive save intent from emitted operations");
assert.match(source, /persistenceRequested:operationsRequestSave\(state\.last_operations\)/, "resolved Bounty Poster routes should project request_save as the persistence signal");
assert.doesNotMatch(source, /persistenceRequested:true/, "Bounty Poster must not keep an independent persistence boolean truth");
assert.match(source, /\{ op:"request_save", reason:"normal_event_bounty_poster" \}/, "resolved owner result should still hand off exactly one save request to shared persistence");

console.log("bounty poster owner-persistence smoke: ok");
