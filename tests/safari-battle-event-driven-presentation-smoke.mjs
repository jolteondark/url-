import assert from "node:assert/strict";
import fs from "node:fs";

const files = [
  "canonical-battle-sprite-bridge.js",
  "canonical-battle-status-bridge.js",
  "trainer-battle-presentation.js",
];

for (const file of files) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  assert.doesNotMatch(source, /new MutationObserver\(/, `${file} must not infer runtime state from DOM mutation`);
  assert.match(source, /safari-runtime-changed/, `${file} must refresh from the explicit runtime-change event`);
}

const trainer = fs.readFileSync(new URL("../trainer-battle-presentation.js", import.meta.url), "utf8");
assert.doesNotMatch(trainer, /addEventListener\("pointerdown"/, "trainer HUD must not need pointer events to discover state changes");
assert.doesNotMatch(trainer, /addEventListener\("click"/, "trainer HUD must not need click events to discover state changes");
assert.match(trainer, /trainer_next/, "trainer replacement presentation must remain connected");

console.log("Safari battle event-driven presentation smoke: ok");
