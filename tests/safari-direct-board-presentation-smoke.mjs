import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const loader = fs.readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");
const camp = fs.readFileSync(new URL("../camp-presentation.js", import.meta.url), "utf8");

assert.match(html, /<link rel="stylesheet" href="\.\/game-presentation\.css"\s*\/>/);
assert.match(html, /<link rel="stylesheet" href="\.\/event-presentation\.css"\s*\/>/);
assert.match(html, /<script type="module" src="\.\/game-presentation\.js"><\/script>/);
assert.doesNotMatch(loader, /loadModule\("\.\/game-presentation\.js"\)/);
assert.doesNotMatch(loader, /function loadBoardPresentation/);
assert.match(loader, /loadModule\("\.\/camp-presentation\.js"\)/);

assert.match(camp, /from "\.\/runtime\/safari-playable-integration\.js"/);
assert.doesNotMatch(camp, /canonical-base=1/);
assert.doesNotMatch(camp, /boundary-trial-presentation\.js/);

console.log("Safari direct board presentation smoke: PASS");
