import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const preview = await readFile(new URL("../preview.js", import.meta.url), "utf8");
const battlers = await readFile(new URL("../runtime/canonical-battle-battler-assets.js", import.meta.url), "utf8");

assert.match(index, /<script type="module" src="\.\/preview\.js\?v=20260913-0000"><\/script>/);
assert.doesNotMatch(index, /preview\.js\?v=20260909-0200/);
assert.match(preview, /from "\.\/runtime\/canonical-battle-battler-assets\.js";/);
assert.doesNotMatch(preview, /canonical-battle-battler-assets\.js\?v=20260907-0130/);
assert.match(battlers, /CANONICAL_BATTLE_BACK_SPECIES[\s\S]*"MAWILE"/);
assert.match(battlers, /assets\/canonical-battle-sprites\/back\/\$\{identifier\}\.png/);

console.log("MAWILE canonical battler shared delivery smoke: ok");
