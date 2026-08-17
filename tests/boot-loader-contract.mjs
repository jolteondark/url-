import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const preview = fs.readFileSync(new URL("../preview.js", import.meta.url), "utf8");
const previewApp = fs.readFileSync(new URL("../preview-app.js", import.meta.url), "utf8");

assert.match(html, /src="\.\/preview\.js"/);
assert.match(html, /src="\.\/deferred-ui-loader\.js"/);
assert.equal(/runtime-on-explicit-action\.js/.test(html), false, "click bootstrap wrapper must not be an HTML entry");
assert.equal(fs.existsSync(new URL("../runtime-on-explicit-action.js", import.meta.url)), false, "click bootstrap wrapper must stay deleted");
assert.equal(fs.existsSync(new URL("../preview-board-start-bridge.js", import.meta.url)), false, "first-board bridge must stay deleted");

assert.ok(Buffer.byteLength(preview, "utf8") < 5_000, "document preview entry must stay lightweight");
assert.match(preview, /armBoard\(/, "New\/Continue must arm the static board before the heavy app loads");
assert.match(preview, /data-boot-board-index/, "static board cells must own a boot-only index");
assert.match(preview, /loadPreviewApp\(Number\(cell\.dataset\.bootBoardIndex\)\)/, "heavy app must load from the first actual board choice");
assert.match(preview, /import\("\.\/preview-app\.js"\)/, "heavy preview app must be demand-loaded");
assert.match(preview, /import\("\.\/runtime\/safari-playable-integration\.js"\)/, "first board choice must call the actual Safari integration owner directly");
assert.match(preview, /import\("\.\/runtime\/safari-general-data-demand\.js"\)/, "first board choice must demand-load canonical GENERAL through its real owner");
assert.match(preview, /activateSafariDayBoardCell\(runtime, index\)/, "selected board index must be activated without a bridge module");
assert.match(preview, /newRun\?\.addEventListener\("click", onNewRun\)/, "New must use a direct element listener");
assert.match(preview, /continueRun\?\.addEventListener\("click", onContinueRun\)/, "Continue must use a direct element listener");
assert.match(preview, /board\?\.addEventListener\("click", onBootBoardChoice\)/, "boot board must use a direct board listener");
assert.doesNotMatch(preview, /document\.addEventListener\("click"/, "boot must not intercept document clicks");
assert.doesNotMatch(preview, /preventDefault|stopImmediatePropagation/, "boot must not suppress or replay input");
assert.doesNotMatch(preview, /preview-board-start-bridge/, "deleted first-board bridge must not be imported");
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
console.log("PASS first-board lazy preview boot contract");
