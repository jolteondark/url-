import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const adapter = fs.readFileSync(path.join(root, "runtime/canonical-battle-ui-assets.js"), "utf8");

assert.match(adapter, /levelOverlay:\s*"\.\/assets\/canonical-battle-ui\/overlay_lv\.png"/);
assert.match(adapter, /--canonical-battle-level-overlay/);
assert.match(adapter, /data-canonical-battle-level/);
assert.match(adapter, /MutationObserver/);
assert.match(adapter, /#foe-level, #player-level/);
assert.doesNotMatch(adapter, /Lv\.\$\{[^}]+\}/, "presentation adapter must not own Battle level truth");

console.log("canonical Battle level overlay presentation smoke passed");