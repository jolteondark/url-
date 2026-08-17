import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const preview = fs.readFileSync(new URL("../preview.js", import.meta.url), "utf8");
const previewApp = fs.readFileSync(new URL("../preview-app.js", import.meta.url), "utf8");

assert.match(html, /src="\.\/preview\.js"/);
assert.match(html, /src="\.\/deferred-ui-loader\.js"/);
assert.equal(/runtime-on-explicit-action\.js/.test(html), false, "click bootstrap wrapper must not be an HTML entry");
assert.equal(fs.existsSync(new URL("../runtime-on-explicit-action.js", import.meta.url)), false, "click bootstrap wrapper must stay deleted");

assert.ok(Buffer.byteLength(preview, "utf8") < 4_000, "document preview entry must stay lightweight");
assert.match(preview, /import\("\.\/preview-app\.js"\)/, "heavy preview app must be demand-loaded");
assert.doesNotMatch(preview, /from\s+["']\.\/runtime\//, "preview entry must not statically import runtime modules");
assert.doesNotMatch(preview, /^import\s+["']\.\/runtime\//m, "preview entry must not side-effect import runtime modules");
assert.doesNotMatch(preview, /\.click\(\)|requestAnimationFrame/, "preview loader must not replay synthetic clicks");
assert.match(previewApp, /from\s+"\.\/runtime\/safari-playable-integration\.js"/, "heavy runtime imports belong in preview-app.js");
assert.match(previewApp, /safari-preview-start/, "preview app must accept the first start action through an explicit event");

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
console.log("PASS lightweight preview boot contract");
