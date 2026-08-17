import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../battle-menu-presentation.js", import.meta.url), "utf8");

assert.doesNotMatch(source, /observe\(document\.body/);
assert.doesNotMatch(source, /attributes\s*:\s*true/);
assert.doesNotMatch(source, /attributeFilter\s*:/);
assert.match(source, /observe\(battleRoot,\{subtree:true,childList:true,characterData:true\}\)/);
assert.match(source, /node\.dataset\.moveId!==id/);
assert.match(source, /slot\.dataset\.itemId!==id/);
assert.match(source, /classList\.contains\("battle-complete"\)!==completed/);

console.log("battle menu Safari observer safety smoke: ok");
