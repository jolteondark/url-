import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const indexSource = await readFile(new URL("../index.html", import.meta.url), "utf8");
const touchSource = await readFile(new URL("../runtime/safari-wishing-fountain-touch.js", import.meta.url), "utf8");
const routesSource = await readFile(new URL("../runtime/safari-wishing-fountain-final-routes.js", import.meta.url), "utf8");
const continuationSource = await readFile(new URL("../runtime/safari-normal-event-battle-continuation.js", import.meta.url), "utf8");

assert.match(
  indexSource,
  /"\.\/runtime\/safari-wishing-fountain-final-routes\.js": "\.\/runtime\/safari-wishing-fountain-final-routes\.js\?v=20260909-1400"/,
  "public import map must version the nested Wishing Fountain final-routes module",
);
assert.doesNotMatch(
  indexSource,
  /safari-wishing-fountain-final-routes\.js\?v=20260909-1255/,
  "stale Wishing Fountain final-routes generation must not remain public",
);
assert.match(
  touchSource,
  /from "\.\/safari-wishing-fountain-final-routes\.js"/,
  "reachable Wishing Fountain touch owner must continue through the shared import-map specifier",
);

const reachSource = routesSource.slice(routesSource.indexOf('if (action === "reach")'));
const battleStart = reachSource.slice(0, reachSource.indexOf('if (roll >= 70'));
assert.match(battleStart, /normal_event_wild_battle_started/);
assert.doesNotMatch(battleStart, /wishing_fountain_battle_started/);
assert.doesNotMatch(battleStart, /persistenceRequested:true/);
assert.match(continuationSource, /request_save[^\n]+normal_event_battle_started/);
assert.doesNotMatch(routesSource, /persistenceRequested\s*:\s*true/);

console.log("wishing fountain final routes public generation smoke: ok");
