import assert from "node:assert/strict";
import fs from "node:fs";

const bridge = fs.readFileSync(new URL("../canonical-battle-ui-bridge.js", import.meta.url), "utf8");

for (const [command, row] of Object.entries({ fight: 0, party: 1, bag: 2, flee: 3 })) {
  assert.match(bridge, new RegExp(`${command}:\\s*${row}`), `canonical command row for ${command} must remain mapped`);
}
assert.match(bridge, /canonicalBattleUiAssetUrl\("cursor_command\.png"\)/, "command buttons must consume the shared canonical cursor resolver");
assert.match(bridge, /backgroundSize = "200% 1000%"/, "260x460 command cursor sheet must remain projected as 2 columns x 10 rows");
assert.match(bridge, /selected \? 100 : 0/, "selected command must use the canonical second cursor column");
assert.match(bridge, /removeProperty\("background-image"\)/, "missing canonical cursor must fail closed to the existing presentation");

console.log("ok - canonical Battle command cursor consumer");
