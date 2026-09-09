import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../runtime/safari-lost-pokemon-interaction.js", import.meta.url), "utf8");

assert.match(source, /function resolvedOperations\(operations, reason = "lost_pokemon_resolved"\)/);
assert.match(source, /operation\?\.op === "request_save"/);
assert.match(source, /reason:"normal_event_post_battle"/);
assert.doesNotMatch(source, /persistenceRequested:true/);

const resolvedAssignments = source.match(/state\.last_operations = resolvedOperations\(/g) ?? [];
assert.ok(resolvedAssignments.length >= 6, `expected resolved Lost Pokemon routes to use resolvedOperations, found ${resolvedAssignments.length}`);

const derivedPersistence = source.match(/persistenceRequested:persistenceRequested\(state\.last_operations\)/g) ?? [];
assert.ok(derivedPersistence.length >= 6, `expected resolved Lost Pokemon routes to derive persistence from operations, found ${derivedPersistence.length}`);

assert.match(source, /join_storage_full[\s\S]*persistenceRequested:false/);
assert.match(source, /search_reward_empty[\s\S]*persistenceRequested:false/);
assert.match(source, /berry_reward_empty[\s\S]*persistenceRequested:false/);
assert.match(source, /berry_failed[\s\S]*persistenceRequested:false/);
