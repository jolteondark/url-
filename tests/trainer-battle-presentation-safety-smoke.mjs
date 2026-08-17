import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const js = await readFile(new URL("../trainer-battle-presentation.js", import.meta.url), "utf8");
const css = await readFile(new URL("../trainer-battle-presentation.css", import.meta.url), "utf8");
const loader = await readFile(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");

assert.match(js, /observe\(arena/);
assert.doesNotMatch(js, /attributes\s*:/);
assert.match(js, /removeAttribute\("aria-disabled"\)/);
assert.doesNotMatch(css, /\.move-grid button/);
assert.doesNotMatch(css, /\.battle-command-panel\{/);
assert.match(loader, /trainer-battle-presentation\.css/);
assert.match(loader, /trainer-battle-presentation\.js/);
console.log("trainer battle presentation safety smoke: ok");
