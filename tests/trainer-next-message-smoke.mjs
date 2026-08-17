import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../trainer-battle-presentation.js", import.meta.url), "utf8");

assert.match(source, /events\[index\]\?\.type === "trainer_next"/);
assert.match(source, /lastReplacementSignature/);
assert.match(source, /syncReplacementFoePresentation\(current\)/);
assert.match(source, /foe-name/);
assert.match(source, /foe-level/);
assert.match(source, /foe-hp/);
assert.match(source, /foe-hp-bar/);
assert.match(source, /battle-message/);
assert.match(source, /繰り出した！/);
assert.match(source, /window\.setTimeout\(\(\) => \{/);
assert.doesNotMatch(source, /attributeFilter:\s*\[[^\]]*style/);

console.log("trainer next message smoke: ok");
