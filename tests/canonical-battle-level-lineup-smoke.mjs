import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const assets = [
  ["../assets/canonical-battle-ui/overlay_lv.png", "888871cef2ffdb7917f37be40f85835e4da855266b91ef91d4abd17ea3caec2c"],
  ["../assets/canonical-battle-ui/icon_ball_status.png", "cd1c9ab5602cfa6d10119f80bd1ecd7050c6eed2f024017cc204fb85efa8bc11"],
];
for (const [path, sha256] of assets) {
  const bytes = await readFile(new URL(path, import.meta.url));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), sha256);
}

const bridge = await readFile(new URL("../canonical-battle-status-bridge.js", import.meta.url), "utf8");
const statusCss = await readFile(new URL("../canonical-battle-status.css", import.meta.url), "utf8");
const trainerCss = await readFile(new URL("../trainer-battle-presentation.css", import.meta.url), "utf8");

assert.match(bridge, /setTextIfChanged/);
assert.match(bridge, /canonical-level-value/);
assert.match(bridge, /pokemon\?\.level \?\? pokemon\?\.lvl/);
assert.doesNotMatch(bridge, /attributes\s*:/);
assert.match(statusCss, /overlay_lv\.png/);
assert.match(statusCss, /padding:0 0 0 22px/);
assert.match(trainerCss, /icon_ball_status\.png/);
console.log("canonical battle level/lineup smoke: ok");
