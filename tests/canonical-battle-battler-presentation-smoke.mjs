import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adapter = readFileSync(new URL("../runtime/canonical-battle-battler-assets.js", import.meta.url), "utf8");
const preview = readFileSync(new URL("../preview.js", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");

for (const species of ["CATERPIE", "DWEBBLE", "TROPIUS"]) {
  assert.match(adapter, new RegExp(`\\"${species}\\"`), `${species} must resolve through the published canonical front set`);
}
assert.match(adapter, /canonical-battle-sprites\/front\/\$\{identifier\}\.png/, "foe battlers must use the shared exact-case canonical front path");
assert.match(adapter, /canonical-battle-sprites\/back\/\$\{identifier\}\.png/, "player battlers must use the shared exact-case canonical back path");
assert.match(adapter, /CANONICAL_BATTLE_BACK_SPECIES = Object\.freeze\(\["DWEBBLE"\]\)/, "only the currently published canonical back sprite may resolve");
assert.match(adapter, /placeholder\.replaceChildren\(\)/, "legacy text battler contents must be removed before canonical rendering");
assert.match(adapter, /canonicalBattleSprite = "missing"/, "unpublished battlers must fail closed instead of falling back to text art");
assert.match(adapter, /__maplessBattleSpriteDiagnostics/, "battler asset misses and delivery failures must remain diagnosable");
assert.match(adapter, /MutationObserver/, "sprite presentation must follow existing species-name truth without owning Battle state");
assert.doesNotMatch(adapter, /variables\.mapless|player\.party|battle\.foe/, "presentation adapter must not duplicate Battle or Pokemon Runtime ownership");
assert.match(preview, /canonical-battle-battler-assets\.js\?v=20260904-0800/, "Safari/Web must request the fresh canonical battler adapter generation");
assert.match(preview, /installCanonicalBattleBattlerAssets\(\)/, "reachable preview must install canonical battler presentation");
assert.match(index, /preview\.js\?v=20260904-0800/, "public entry point must bust stale Safari preview cache");

console.log("canonical Battle battler presentation smoke: ok");
