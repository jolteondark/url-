import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SAFARI_SPECIES_FORM_FRONT_ATLAS,
  resolveSafariSpeciesFormFrontSprite,
} from "../runtime/safari-species-form-front-atlas.js";

assert.ok(SAFARI_SPECIES_FORM_FRONT_ATLAS.recordCount >= 1600);
for (const species of ["LUCARIO", "MIMIKYU", "TINKATON", "HYDREIGON"]) {
  const sprite = resolveSafariSpeciesFormFrontSprite(species);
  assert.ok(sprite, `${species} must have a broad species/form fallback sprite`);
  assert.equal(sprite.species, species);
}

const bridge = readFileSync(new URL("../canonical-battle-sprite-bridge.js", import.meta.url), "utf8");
assert.match(bridge, /applySafariDay1Back96Sprite/);
assert.match(bridge, /applySafariSpeciesFormFrontSprite/);
assert.match(bridge, /species-form-front-for-back/);
assert.match(bridge, /safari-species-form-front-atlas-state/);

const backPatch = readFileSync(new URL("../canonical-battle-back-atlas-patch.js", import.meta.url), "utf8");
assert.match(backPatch, /applySafariSpeciesFormFrontSprite/);
assert.match(backPatch, /back-fallback-front/);

const loader = readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");
assert.match(loader, /canonical-battle-sprite-bridge\.js\?v=20260825-1042/);
assert.match(loader, /canonical-battle-back-atlas-patch\.js\?v=20260825-1042/);

console.log("safari battle sprite fallback coverage smoke: PASS");
