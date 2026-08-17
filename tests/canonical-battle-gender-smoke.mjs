import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const js = await readFile(new URL("../canonical-battle-status-bridge.js", import.meta.url), "utf8");
const css = await readFile(new URL("../canonical-battle-status.css", import.meta.url), "utf8");

assert.match(js, /pokemon\?\.gender \?\? pokemon\?\.sex/);
assert.match(js, /value === 0/);
assert.match(js, /value === 1/);
assert.match(js, /"♂"/);
assert.match(js, /"♀"/);
assert.doesNotMatch(js, /attributes\s*:/);
assert.match(css, /\.canonical-gender\[data-gender="male"\]/);
assert.match(css, /\.canonical-gender\[data-gender="female"\]/);
console.log("canonical battle gender smoke: ok");
