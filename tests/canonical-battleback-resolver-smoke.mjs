import assert from "node:assert/strict";
import {
  CANONICAL_BATTLEBACK_VARIANTS,
  canonicalBattlebackTimeIdentifier,
  resolveCanonicalBattlebackAssets,
} from "../runtime/canonical-battleback-assets.js";

assert.deepEqual(resolveCanonicalBattlebackAssets("day"), {
  background:"./assets/canonical-battlebacks/field_bg.png",
  playerBase:"./assets/canonical-battlebacks/field_base0.png",
  foeBase:"./assets/canonical-battlebacks/field_base1.png",
});
assert.deepEqual(resolveCanonicalBattlebackAssets(1), CANONICAL_BATTLEBACK_VARIANTS.eve);
assert.deepEqual(resolveCanonicalBattlebackAssets("night"), CANONICAL_BATTLEBACK_VARIANTS.night);
assert.equal(canonicalBattlebackTimeIdentifier("evening"), "eve");
assert.equal(resolveCanonicalBattlebackAssets("dawn"), null);

const publishedPaths = Object.values(CANONICAL_BATTLEBACK_VARIANTS).flatMap((variant) => Object.values(variant));
assert.equal(publishedPaths.length, 9);
assert.equal(new Set(publishedPaths).size, 9);
for (const path of publishedPaths) {
  assert.match(path, /^\.\/assets\/canonical-battlebacks\/field(?:_(?:eve|night))?_(?:bg|base[01])\.png$/);
}

console.log("canonical battleback resolver exact-case paths ok");
