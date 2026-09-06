import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const read = (path) => readFileSync(join(root, path), "utf8");

const adapter = read("runtime/canonical-battle-status-assets.js");
const preview = read("preview.js");
const asset = "assets/canonical-battle-ui/icon_statuses.png";

assert.ok(existsSync(join(root, asset)), "canonical Battle icon_statuses.png must exist at exact-case public path");
assert.match(adapter, /CANONICAL_BATTLE_STATUS_ASSET\s*=\s*"\.\/assets\/canonical-battle-ui\/icon_statuses\.png"/, "status adapter must own the canonical asset path");
assert.match(adapter, /SLEEP:\s*0[\s\S]*POISON:\s*1[\s\S]*BURN:\s*2[\s\S]*PARALYSIS:\s*3[\s\S]*FROZEN:\s*4/, "status rows must follow Essentials canonical icon positions");
assert.match(adapter, /CANONICAL_BATTLE_STATUS_ROW_COUNT\s*=\s*6/, "Battle status spritesheet must retain the toxic sixth row");
assert.match(adapter, /runtime\?\.variables\?\.mapless\?\.battle/, "Presentation must consume existing battle owner state instead of inventing status truth");
assert.match(adapter, /battle\.foe\?\.status/, "foe status must come from owner Pokémon runtime state");
assert.match(adapter, /activeBattlePlayer\(runtime, battle\)\?\.status/, "player status must come from owner Pokémon runtime state");
assert.match(adapter, /unsupported_status/, "unknown owner status must fail closed with a diagnostic");
assert.match(adapter, /canonicalBattleStatusAsset = "error"/, "asset load failure must be diagnosable and isolated");
assert.match(preview, /canonical-battle-status-assets\.js\?v=20260906-1400/, "reachable preview must request the current status adapter generation");
assert.match(preview, /installCanonicalBattleStatusAssets\(\)/, "reachable preview must install canonical Battle status presentation");
assert.doesNotMatch(adapter, /background-color\s*:/, "status adapter must not invent an HTML/CSS substitute for canonical status art");

console.log("canonical Battle status presentation smoke: ok");
