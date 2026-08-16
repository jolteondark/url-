import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
assert.match(html, /src="\.\/preview\.js"/);
assert.match(html, /src="\.\/deferred-ui-loader\.js"/);
for (const direct of ["battle-sprite-bridge.js","game-menu-bridge.js","party-panel-bridge.js","storage-panel-bridge.js","species-sprite-atlas-bridge.js","trainer-battle-presentation.js"]) {
  const directPattern = new RegExp(`<script[^>]+src="\\./${direct.replaceAll(".", "\\.")}"`);
  assert.equal(directPattern.test(html), false, `${direct} must not boot directly from index.html`);
}
const ai = fs.readFileSync(new URL("../runtime/safari-playable-integration-ai.js", import.meta.url), "utf8");
assert.equal(ai.includes('import "../camp-presentation.js"'), false);
console.log("PASS boot loader contract");
