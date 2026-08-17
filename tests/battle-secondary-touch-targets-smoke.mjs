import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../canonical-battle-ui.css", import.meta.url), "utf8");
assert.match(css, /\.battle-actions button\{min-height:52px/);
assert.match(css, /touch-action:manipulation/);
assert.match(css, /@media\(max-width:430px\)[\s\S]*\.battle-actions button\{min-height:56px/);
assert.match(css, /\.move-grid\{[\s\S]*overlay_fight\.png/);
assert.match(css, /grid-template-columns:3fr 3fr 2fr/);
console.log("battle secondary touch targets smoke: ok");
