import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../canonical-battle-sprite-bridge.js", import.meta.url), "utf8");

assert.match(source, /side === "player"\s*\? applySafariDay1Back96Sprite/);
assert.match(source, /!preferredApplied && side === "foe"/);
assert.doesNotMatch(source, /back-fallback-front/);
assert.doesNotMatch(source, /species-form-front-for-back/);
assert.match(source, /family: "front"/);

console.log("canonical player back fallback fails closed");
