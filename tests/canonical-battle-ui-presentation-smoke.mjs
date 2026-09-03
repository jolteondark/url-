import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const adapter = fs.readFileSync(path.join(root, "runtime", "canonical-battle-ui-assets.js"), "utf8");
const preview = fs.readFileSync(path.join(root, "preview.js"), "utf8");

for (const asset of ["databox_normal.png", "databox_normal_foe.png", "overlay_message.png"]) {
  assert.ok(adapter.includes(`assets/canonical-battle-ui/${asset}`), `shared Battle UI adapter must map ${asset}`);
}
assert.match(adapter, /background-image:\s*var\(--canonical-battle-player-databox\)/, "player databox must render from canonical asset mapping");
assert.match(adapter, /background-image:\s*var\(--canonical-battle-foe-databox\)/, "foe databox must render from canonical asset mapping");
assert.match(adapter, /background-image:\s*var\(--canonical-battle-message-overlay\)/, "message frame must render from canonical asset mapping");
assert.match(adapter, /\.battle-message::after[\s\S]*?content:\s*none/, "CSS triangle continuation replica must be suppressed on canonical presentation");
assert.match(adapter, /canonicalBattleUi\s*=\s*"error"/, "asset failure must expose a fail-closed presentation state");
assert.match(preview, /installCanonicalBattleUiAssets/, "reachable preview boot must install the shared canonical Battle UI adapter");

console.log("Canonical Battle UI presentation smoke passed");
