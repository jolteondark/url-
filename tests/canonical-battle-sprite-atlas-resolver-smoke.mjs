import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  canonicalBattleSpriteAtlasPath,
  canonicalBattleSpriteAtlasResolutionState,
} from "../runtime/canonical-battle-sprite-atlas-sources.js";

assert.equal(
  canonicalBattleSpriteAtlasPath("day1-back-96", 0),
  "../assets/canonical-battle-sprites/day1-back/back-00.webp",
);
assert.equal(
  canonicalBattleSpriteAtlasPath("day1-front-96", 5),
  "../assets/canonical-battle-sprites/day1-front/front-05.webp",
);
assert.equal(canonicalBattleSpriteAtlasPath("day1-back-96", 1), null);
assert.equal(canonicalBattleSpriteAtlasPath("day1-front-96", 6), null);
assert.equal(canonicalBattleSpriteAtlasResolutionState("day1-back-96", 0).status, "eligible");
assert.equal(canonicalBattleSpriteAtlasResolutionState("unknown", 0).status, "blocked");

for (const file of ["safari-day1-back-96-atlas.js", "safari-day1-front-96-atlas.js"]) {
  const source = await readFile(new URL(`../runtime/${file}`, import.meta.url), "utf8");
  assert.match(source, /canonicalBattleSpriteAtlasUrl/);
  assert.doesNotMatch(source, /new URL\(`?\.\.\/assets\/canonical-battle-sprites/);
}

console.log("canonical battle sprite atlas resolver smoke: ok");
