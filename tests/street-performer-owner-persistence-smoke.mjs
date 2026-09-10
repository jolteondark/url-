import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-street-performer-interaction.js", import.meta.url), "utf8");

assert.match(source, /function persistenceRequestedFromOperations\(operations\)/);
assert.match(source, /operations\.push\(\{ op:"request_save", reason:"normal_event_resolved" \}\)/);
assert.match(source, /reason:"normal_event_post_trainer_battle"/);

const hardCodedTrue = source.match(/persistenceRequested:true/g) ?? [];
assert.equal(hardCodedTrue.length, 0, "Street Performer must not carry a second hard-coded persistence truth");

const projected = source.match(/persistenceRequested:persistenceRequestedFromOperations\(state\.last_operations\)/g) ?? [];
assert.ok(projected.length >= 5, "resolved routes and Battle continuation must project persistence from owner operations");

console.log("street performer owner persistence smoke: ok");
