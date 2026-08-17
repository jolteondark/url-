import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const preview = fs.readFileSync(new URL("../preview.js", import.meta.url), "utf8");
const previewApp = fs.readFileSync(new URL("../preview-app.js", import.meta.url), "utf8");
const webFacade = fs.readFileSync(new URL("../runtime/safari-web-playable-integration.js", import.meta.url), "utf8");
const webStartup = fs.readFileSync(new URL("../runtime/safari-web-startup.js", import.meta.url), "utf8");
const combatStart = fs.readFileSync(new URL("../runtime/safari-web-combat-start.js", import.meta.url), "utf8");

assert.match(html, /src="\.\/preview\.js"/);
assert.match(html, /src="\.\/deferred-ui-loader\.js"/);
assert.equal(/runtime-on-explicit-action\.js/.test(html), false, "click bootstrap wrapper must not be an HTML entry");
assert.equal(fs.existsSync(new URL("../runtime-on-explicit-action.js", import.meta.url)), false, "click bootstrap wrapper must stay deleted");
assert.equal(fs.existsSync(new URL("../preview-board-start-bridge.js", import.meta.url)), false, "first-board bridge must stay deleted");

assert.ok(Buffer.byteLength(preview, "utf8") < 5_000, "document preview entry must stay lightweight");
assert.match(preview, /armBoard\(/, "New\/Continue must arm the static board before gameplay modules load");
assert.match(preview, /data-boot-board-index/, "static board cells must own a boot-only index");
assert.match(preview, /loadPreviewApp\(Number\(cell\.dataset\.bootBoardIndex\)\)/, "preview app must load from the first actual board choice");
assert.match(preview, /import\("\.\/preview-app\.js"\)/, "preview app must be demand-loaded");
assert.match(preview, /import\("\.\/runtime\/safari-web-playable-integration\.js"\)/, "first board choice must use the Safari lazy facade");
assert.doesNotMatch(preview, /import\("\.\/runtime\/safari-playable-integration\.js"\)/, "first board choice must not import the full integration graph");
assert.match(preview, /await activateSafariDayBoardCell\(runtime, index\)/, "selected board index must await the lazy facade");
assert.match(preview, /newRun\?\.addEventListener\("click", onNewRun\)/, "New must use a direct element listener");
assert.match(preview, /continueRun\?\.addEventListener\("click", onContinueRun\)/, "Continue must use a direct element listener");
assert.match(preview, /board\?\.addEventListener\("click", onBootBoardChoice\)/, "boot board must use a direct board listener");
assert.doesNotMatch(preview, /document\.addEventListener\("click"/, "boot must not intercept document clicks");
assert.doesNotMatch(preview, /preventDefault|stopImmediatePropagation/, "boot must not suppress or replay input");
assert.doesNotMatch(preview, /\.click\(\)|requestAnimationFrame/, "preview loader must not replay synthetic clicks");

assert.match(previewApp, /from\s+"\.\/runtime\/safari-web-playable-integration\.js"/, "preview app must use the lazy facade");
assert.doesNotMatch(previewApp, /from\s+"\.\/runtime\/safari-playable-integration\.js"/, "preview app must not statically import the full integration graph");
assert.match(previewApp, /await activateSafariDayBoardCell\(runtime, index\)/, "board activation must support the lazy async facade");
assert.match(previewApp, /await resolveSafariBattleRound/, "Battle engine may load at move selection");
assert.match(previewApp, /import\("\.\/runtime\/safari-flee-command\.js"\)/, "flee owner must stay scene-demand only");
assert.match(previewApp, /import\("\.\/runtime\/safari-village-fixed-shop-integration\.js"\)/, "fixed shop owner must stay village-demand only");
assert.match(previewApp, /safari-preview-start/, "preview app must accept the first start action through an explicit event");

assert.doesNotMatch(webStartup, /battle-core|browser-battle|battle-runtime|capture-flow|pokemon-runtime\.js/, "startup runtime must not import Battle/Pokemon engines");
assert.match(webFacade, /import\("\.\/safari-playable-integration\.js"\)/, "full integration must be demand-loaded behind the facade");
assert.doesNotMatch(webFacade, /^import .*safari-playable-integration\.js/m, "full integration must never be a static facade dependency");
assert.match(webFacade, /import\("\.\/safari-web-combat-start\.js"\)/, "combat start must have a dedicated demand boundary");
assert.doesNotMatch(combatStart, /browser-battle-round-runtime|browser-trainer-battle-round-runtime|trainer-choice-priority-flinch/, "combat start must not pull the Battle round engine");
assert.match(combatStart, /resolveBattleStartCore/, "combat start still uses the Battle start owner");

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
console.log("PASS lazy Safari battle-engine boot contract");
