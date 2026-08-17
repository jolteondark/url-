import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bridge = await readFile(new URL("../canonical-battle-status-bridge.js", import.meta.url), "utf8");
const css = await readFile(new URL("../canonical-battle-status.css", import.meta.url), "utf8");
const loader = await readFile(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");

for (const status of ["SLEEP", "POISON", "BURN", "PARALYSIS", "FROZEN"]) {
  assert.match(bridge, new RegExp(`${status}:`));
}
assert.match(bridge, /new MutationObserver\(scheduleSync\)/);
assert.doesNotMatch(bridge, /attributes\s*:/);
assert.match(css, /canonical-status-badge/);
assert.match(loader, /canonical-battle-status\.css/);
assert.match(loader, /canonical-battle-status-bridge\.js/);
console.log("canonical battle status presentation smoke: ok");
