import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const resolver = readFileSync(new URL("../runtime/canonical-battle-battler-assets.js", import.meta.url), "utf8");
const preview = readFileSync(new URL("../preview.js", import.meta.url), "utf8");

for (const species of ["DRUDDIGON", "GASTLY", "HERACROSS"]) {
  assert.match(resolver, new RegExp(`\\"${species}\\"`), `${species} must be owned by the shared player back-sprite resolver`);
  assert.equal(
    existsSync(new URL(`../assets/canonical-battle-sprites/back/${species}.png`, import.meta.url)),
    true,
    `${species} canonical back sprite must be publicly present with exact case`,
  );
}

assert.match(
  preview,
  /canonical-battle-battler-assets\.js\?v=20260905-1000/,
  "preview must request the fresh shared battler resolver generation",
);
assert.doesNotMatch(
  preview,
  /canonical-battle-battler-assets\.js\?v=20260904-1800/,
  "preview must not retain the stale shared battler resolver generation",
);

console.log("player back sprite batch 1 public delivery smoke: ok");
