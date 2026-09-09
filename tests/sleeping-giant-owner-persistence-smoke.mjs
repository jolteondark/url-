import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../runtime/safari-sleeping-giant-interaction.js", import.meta.url), "utf8");

// Resolved Sleeping Giant routes must project save intent into operations and derive
// the adapter persistence flag from those operations rather than hard-coding true.
assert.match(source, /function resolvedOperations\(owner, extraOperations=\[\], reason="sleeping_giant_resolved"\)/);
assert.match(source, /operations\.push\(\{ op:"request_save", reason \}\)/);
assert.match(source, /function persistenceRequested\(operations\)/);
assert.doesNotMatch(source, /persistenceRequested:true/);

// Leave, non-battle steal success, and post-battle continuation all share the same projection.
assert.match(source, /state\.last_operations = resolvedOperations\(owner\);/);
assert.match(source, /state\.last_operations = resolvedOperations\(owner, receipt\.operations\)/);
assert.match(source, /resolvedOperations\(owner, \[/);
assert.match(source, /"normal_event_post_battle"/);

// Battle start remains delegated to the shared normal-event continuation owner.
assert.match(source, /activateSafariNormalEventWildBattle\(runtime, index/);
assert.match(source, /registerSafariNormalEventBattleContinuation\("sleeping_giant"/);

console.log("sleeping giant owner persistence smoke: ok");
