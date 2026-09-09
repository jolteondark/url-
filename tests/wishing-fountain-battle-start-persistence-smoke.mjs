import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const interactionSource = await readFile(new URL("../runtime/safari-wishing-fountain-final-routes.js", import.meta.url), "utf8");
const continuationSource = await readFile(new URL("../runtime/safari-normal-event-battle-continuation.js", import.meta.url), "utf8");

const reachSource = interactionSource.slice(interactionSource.indexOf('if (action === "reach")'));
const battleStart = reachSource.slice(0, reachSource.indexOf('if (roll >= 70'));
assert.match(battleStart, /normal_event_wild_battle_started/);
assert.doesNotMatch(battleStart, /wishing_fountain_battle_started/);
assert.doesNotMatch(battleStart, /persistenceRequested:true/);
assert.match(battleStart, /operations:state\.last_operations/);

assert.match(
  continuationSource,
  /request_save[^\n]+normal_event_battle_started/,
  "shared normal-event Battle continuation must own the Battle-start save intent",
);

console.log("wishing fountain Battle start persistence smoke: ok");
