import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const core = await readFile(new URL("../runtime/battle-core-combat-turn.js", import.meta.url), "utf8");

const generation = "20260912-2130";
for (const specifier of [
  "safari-normal-battle-round-base",
  "browser-battle-round-runtime",
  "battle-core-combat-turn",
  "battle-runtime-integration",
]) {
  assert.match(
    index,
    new RegExp(`"\\./runtime/${specifier}\\.js": "\\./runtime/${specifier}\\.js\\?v=${generation}"`),
    `${specifier} must publish the post-#1508 generation`,
  );
}

assert.doesNotMatch(index, /battle-core-combat-turn\.js\?v=20260910-0900/);
assert.match(core, /targetBerryStatChangesCanonical/);
assert.match(core, /subject:\s*"target"/);
assert.match(core, /suppressInapplicableTargetBerryCanonical/);
assert.match(core, /consumeRequest:\s*null/);

console.log("Battle pinch-stat Berry public generation smoke: PASS");
