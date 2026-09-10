import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-street-performer-interaction.js", import.meta.url), "utf8");

assert.match(source, /function operationsRequestSave\(operations = \[\]\)/, "Street Performer should derive save intent from emitted operations");
assert.match(source, /\{ op:"request_save", reason:"normal_event_street_performer" \}/, "resolved non-Battle Street Performer routes should emit request_save");
assert.match(source, /\{ op:"request_save", reason:"normal_event_post_trainer_battle" \}/, "post-Battle continuation should preserve its request_save handoff");
assert.doesNotMatch(source, /persistenceRequested:true/, "Street Performer must not keep an independent persistence boolean truth");
assert.ok((source.match(/persistenceRequested:operationsRequestSave\(state\.last_operations\)/g) ?? []).length >= 5, "perform, watch, non-fraud callout, leave, and Battle continuation should all project persistence from operations");

console.log("street performer owner-persistence smoke: ok");
