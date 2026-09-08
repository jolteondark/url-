import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const continuation = await readFile(new URL("../runtime/safari-normal-event-battle-continuation.js", import.meta.url), "utf8");
const combatStart = await readFile(new URL("../runtime/safari-web-combat-start.js", import.meta.url), "utf8");
const persistence = await readFile(new URL("../runtime/safari-owner-result-persistence.js", import.meta.url), "utf8");

const bindStart = continuation.indexOf("export function bindSafariNormalEventBattleContinuation");
const bindEnd = continuation.indexOf("export function rollbackSafariNormalEventBattleContinuation", bindStart);
assert.ok(bindStart >= 0 && bindEnd > bindStart, "shared continuation bind owner must exist");
const bind = continuation.slice(bindStart, bindEnd);
assert.match(bind, /request_save/);
assert.match(bind, /reason:\s*"normal_event_battle_started"/);
assert.match(bind, /state\.last_operations\s*=\s*operations/);

const startOperationReturns = combatStart.match(/operations:\s*state\.battle\?\.last_operations\s*\?\?\s*\[\]/g) ?? [];
assert.ok(startOperationReturns.length >= 2, "wild and trainer normal-event Battle starts must return Battle owner operations");
assert.match(persistence, /operation\?\.op\s*===\s*"request_save"/);

console.log("shared normal-event Battle start persistence smoke: ok");
