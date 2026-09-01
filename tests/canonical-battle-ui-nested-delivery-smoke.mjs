import assert from "node:assert/strict";
import fs from "node:fs";

const bridge = fs.readFileSync(new URL("../canonical-battle-ui-bridge.js", import.meta.url), "utf8");
const loader = fs.readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");

assert.match(bridge, /canonical-battle-ui-sources\.js\?v=20260902-0657/, "Battle UI resolver import must be revision-pinned with the current presentation generation");
assert.match(bridge, /trainer-battle-canonical-sprite\.js\?v=20260902-0657/, "trainer sprite sidecar import must not remain on the pre-cursor cache generation");
assert.match(loader, /BATTLE_PRESENTATION_PUBLIC_REVISION = "20260902-0657"/, "outer Battle presentation delivery must advance with nested resolver pins");
assert.doesNotMatch(bridge, /20260901-2158/, "stale nested Battle presentation revision must not return");

console.log("canonical battle ui nested delivery smoke: ok");
