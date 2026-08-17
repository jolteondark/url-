import assert from "node:assert/strict";
import fs from "node:fs";

const stateProjectionFiles = [
  "battle-sprite-bridge.js",
  "battle-menu-presentation.js",
  "canonical-battle-sprite-bridge.js",
  "canonical-battle-status-bridge.js",
  "trainer-battle-presentation.js",
];

for (const file of stateProjectionFiles) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  assert.doesNotMatch(source, /new MutationObserver\(/, `${file} must not infer Battle runtime state from DOM mutations`);
  assert.match(source, /safari-runtime-changed/, `${file} must refresh from the explicit Safari runtime event`);
}

const menu = fs.readFileSync(new URL("../battle-menu-presentation.js", import.meta.url), "utf8");
assert.doesNotMatch(menu, /addEventListener\("pointerdown"/, "battle menu decoration must not poll state through pointer events");
assert.doesNotMatch(menu, /addEventListener\("click"/, "battle menu decoration must not poll state through click events");

const legacySprite = fs.readFileSync(new URL("../battle-sprite-bridge.js", import.meta.url), "utf8");
assert.match(legacySprite, /function ownerSide\(side\)/, "legacy fallback sprite projection must remain owner-backed");
assert.match(legacySprite, /pageshow/, "sprite projection should keep a lifecycle refresh fallback");

console.log("Safari Battle state projection observer guard: ok");
