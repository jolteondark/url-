import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, loader, camp] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../deferred-ui-loader.js", import.meta.url), "utf8"),
  readFile(new URL("../camp-presentation.js", import.meta.url), "utf8"),
]);

assert.match(html, /<script type="module" src="\.\/camp-presentation\.js"><\/script>/,
  "camp presentation must be a direct module entry");
assert.doesNotMatch(loader, /camp-presentation\.js|loadCampPresentation|boardEventForButton|stopImmediatePropagation|preventDefault/,
  "deferred loader must not own or intercept next-day camp input");
assert.match(camp, /board_events\?\.\[index\]/,
  "camp entry must inspect the explicit runtime board event");
assert.match(camp, /kind!=="next_day"/,
  "camp entry must only intercept canonical next_day cells");
assert.match(camp, /activateSafariDayBoardCell, saveSafariPlayableRun/,
  "camp must use the direct runtime integration import");
assert.doesNotMatch(camp, /await import\(|import\("\.\/runtime\/safari-web-playable-integration\.js"\)/,
  "camp confirmation must not reconstruct its runtime owner through a dynamic import");
assert.doesNotMatch(camp, /stopImmediatePropagation|preventDefault/,
  "camp should use the minimum UI event semantics required to defer the board action");

console.log("safari direct camp entry smoke: ok");
