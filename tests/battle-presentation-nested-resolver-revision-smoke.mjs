import fs from "node:fs";
import assert from "node:assert/strict";

const uiBridge = fs.readFileSync(new URL("../canonical-battle-ui-bridge.js", import.meta.url), "utf8");
const trainerSprite = fs.readFileSync(new URL("../trainer-battle-canonical-sprite.js", import.meta.url), "utf8");
const trainerPresentation = fs.readFileSync(new URL("../trainer-battle-presentation.js", import.meta.url), "utf8");

for (const [label, source, dependency] of [
  ["Battle UI bridge", uiBridge, "./runtime/canonical-battle-ui-sources.js"],
  ["trainer sprite", trainerSprite, "./runtime/canonical-trainer-sources.js"],
  ["trainer presentation", trainerPresentation, "./runtime/canonical-battle-ui-sources.js"],
]) {
  assert.match(
    source,
    new RegExp(`${dependency.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\?v=\\d{8}-\\d{4}`),
    `${label} must pin its nested canonical resolver to a public delivery revision`,
  );
}

assert.match(
  uiBridge,
  /trainer-battle-canonical-sprite\.js\?v=\d{8}-\d{4}/,
  "Battle UI bridge must pin nested trainer sprite delivery",
);

console.log("battle presentation nested resolver revision smoke: ok");
