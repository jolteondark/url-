import assert from "node:assert/strict";
import fs from "node:fs";

const stateProjectionFiles = [
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

const activeSprite = fs.readFileSync(new URL("../canonical-battle-sprite-bridge.js", import.meta.url), "utf8");
assert.match(activeSprite, /function ownerIdentity\(side\)/, "active canonical sprite projection must remain owner-backed");
assert.match(activeSprite, /pageshow/, "active sprite projection should keep a lifecycle refresh fallback");
assert.equal(fs.existsSync(new URL("../battle-sprite-bridge.js", import.meta.url)), false, "unused legacy battle sprite bridge must stay removed");

console.log("Safari Battle state projection observer guard: ok");
