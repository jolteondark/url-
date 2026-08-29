import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const loader = readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../canonical-battle-ui.css", import.meta.url), "utf8");

assert.match(loader, /function loadBattleChrome\(\)/);
assert.match(loader, /canonical-battle-ui\.css\?v=20260829-2001/);
assert.match(loader, /canonical-battle-status\.css\?v=20260829-2001/);
assert.match(loader, /canonical-battle-ui-bridge\.js\?v=20260829-2001/);
assert.match(loader, /canonical-battle-status-bridge\.js\?v=20260829-2001/);
assert.match(loader, /if \(state\?\.battle\) \{[\s\S]*loadBattleUi\(\);[\s\S]*loadBattleChrome\(\);/);

const startBlock = loader.match(/if \(start\) \{[\s\S]*?return;\n  \}/)?.[0] ?? "";
assert.doesNotMatch(startBlock, /loadBattleChrome\(/, "canonical chrome must remain battle-demand only");

for (const asset of [
  "databox_normal.png",
  "databox_normal_foe.png",
  "overlay_hp.png",
  "overlay_message.png",
  "overlay_fight.png",
  "types.png",
]) {
  assert.match(css, new RegExp(`canonical-battle-ui/${asset.replace(".", "\\.")}`), `${asset} must remain wired`);
}

console.log("safari canonical battle chrome delivery smoke: PASS");
