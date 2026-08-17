import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const repoRoot = new URL("../", import.meta.url);

assert.match(index, /<script type="module" src="\.\/preview\.js"><\/script>/, "index must load preview.js directly");
assert.doesNotMatch(index, /runtime-on-first-action\.js/, "first-action bootstrap wrapper must stay deleted");
assert.equal(existsSync(new URL("runtime-on-first-action.js", repoRoot)), false, "runtime-on-first-action.js must not exist");
assert.doesNotMatch(index, /画面をタップするとゲームを読み込みます。/, "startup copy must not imply pointer-gated bootstrap");

console.log("safari direct preview entry smoke: ok");
