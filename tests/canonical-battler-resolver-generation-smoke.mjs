import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const preview = readFileSync(new URL("../preview.js", import.meta.url), "utf8");

assert.match(
  preview,
  /canonical-battle-battler-assets\.js\?v=20260906-1900/,
  "preview must request the post-KANGASKHAN canonical battler resolver generation",
);

console.log("canonical battler resolver generation smoke: ok");
