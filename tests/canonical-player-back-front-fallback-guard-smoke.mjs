import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../canonical-battle-back-atlas-patch.js", import.meta.url), "utf8");

assert.match(source, /canonical-player-back-front-guard/);
assert.match(source, /\.combatant\.player \.canonical-battle-atlas-fallback\[data-battle-sprite-fallback="species-form-front-for-back"\]/);
assert.match(source, /display:none!important/);
assert.match(source, /data-battle-sprite-fallback/);
assert.match(source, /applySafariDay1Back96Sprite\(fallback, species/);
assert.doesNotMatch(source, /applySafariSpeciesFormFrontSprite/);

console.log("canonical player back front-fallback guard smoke: ok");
