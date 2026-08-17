import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const loader = fs.readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");
const camp = fs.readFileSync(new URL("../camp-presentation.js", import.meta.url), "utf8");
const bridgeShell = fs.readFileSync(new URL("../bridge-shell.css", import.meta.url), "utf8");

assert.match(html, /<link rel="stylesheet" href="\.\/style\.css"\s*\/>/);
assert.doesNotMatch(html, /href="\.\/bridge-shell\.css"/);
assert.doesNotMatch(html, /href="\.\/game-presentation\.css"/);
assert.doesNotMatch(html, /href="\.\/event-presentation\.css"/);
assert.doesNotMatch(html, /src="\.\/game-presentation\.js"/);
assert.match(loader, /function loadBoardPresentation/);
assert.match(loader, /loadStyle\("\.\/game-presentation\.css"\)/);
assert.match(loader, /loadStyle\("\.\/event-presentation\.css"\)/);
assert.match(loader, /loadModule\("\.\/game-presentation\.js"\)/);
assert.match(loader, /#new-run,#continue-run/);
assert.match(loader, /queueMicrotask\(\(\) => loadBoardPresentation\(\)\)/);
assert.match(loader, /loadStyle\("\.\/bridge-shell\.css"\)/);
assert.doesNotMatch(bridgeShell, /@import[^\n]*battle-core-safety\.css/);
assert.match(loader, /loadStyle\("\.\/battle-core-safety\.css"\)/);

assert.match(loader, /loadModule\("\.\/camp-presentation\.js"\)/);
assert.match(loader, /boardEventForButton\(button\)\?\.kind === "next_day"/);
assert.match(loader, /openSafariCamp\?\.\(button, index\)/);
assert.match(loader, /\{ capture: true \}/, "next_day import gate must run before board activation");

assert.match(camp, /from "\.\/runtime\/safari-web-playable-integration\.js"/);
assert.doesNotMatch(camp, /from "\.\/runtime\/safari-playable-integration\.js"/);
assert.match(camp, /export function openSafariCamp/);
assert.match(camp, /await activateSafariDayBoardCell\(rt,index\)/);
assert.doesNotMatch(camp, /button\.click\(\)/, "camp confirm must not replay a synthetic board click");
assert.doesNotMatch(camp, /canonical-base=1/);
assert.doesNotMatch(camp, /boundary-trial-presentation\.js/);

console.log("Safari deferred board presentation smoke: PASS");
