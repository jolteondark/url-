import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../canonical-battle-back-atlas-patch.js", import.meta.url), "utf8");

assert.match(source, /applySafariDay1Back96Sprite/);
assert.doesNotMatch(source, /applySafariSpeciesFormFrontSprite/);
assert.doesNotMatch(source, /back-fallback-front/);
assert.match(source, /if \(!backApplied\) \{[\s\S]*fallback\.hidden = true;/);
assert.match(source, /battleSpriteFallback = "canonical-back-96"/);

console.log("canonical back battler fail-closed smoke: PASS");
