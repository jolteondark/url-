import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const boot = fs.readFileSync(new URL("../runtime-on-explicit-action.js", import.meta.url), "utf8");

assert.match(html, /src="\.\/runtime-on-explicit-action\.js"/);
assert.equal(/src="\.\/preview\.js"/.test(html), false, "preview.js must not boot directly from index.html");
assert.equal(/src="\.\/deferred-ui-loader\.js"/.test(html), false, "deferred UI must not boot directly from index.html");
assert.match(boot, /import\("\.\/preview\.js"\)/);
assert.match(boot, /import\("\.\/deferred-ui-loader\.js"\)/);
assert.match(boot, /#new-run,#continue-run/);
assert.match(boot, /data-boot-board-index/);
assert.match(boot, /armLightweightBoard/);

for (const direct of [
  "battle-sprite-bridge.js",
  "game-menu-bridge.js",
  "party-panel-bridge.js",
  "storage-panel-bridge.js",
  "species-sprite-atlas-bridge.js",
  "trainer-battle-presentation.js",
]) {
  const directPattern = new RegExp(`<script[^>]+src="\\./${direct.replaceAll(".", "\\.")}"`);
  assert.equal(directPattern.test(html), false, `${direct} must not boot directly from index.html`);
}

const ai = fs.readFileSync(new URL("../runtime/safari-playable-integration-ai.js", import.meta.url), "utf8");
assert.equal(ai.includes('import "../camp-presentation.js"'), false);
console.log("PASS boot loader contract");
