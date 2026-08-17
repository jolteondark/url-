import assert from "node:assert/strict";
import fs from "node:fs";

const facade = fs.readFileSync(new URL("../runtime/safari-web-playable-integration.js", import.meta.url), "utf8");
const prewarm = fs.readFileSync(new URL("../runtime/safari-battle-runtime-prewarm.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(facade, /import\("\.\/safari-playable-integration-pre-wounded\.js"\)/,
  "normal Battle runtime must use the minimal pre-wounded/legacy graph");
assert.match(facade, /battle\?\.origin === "boundary_trial"/,
  "boundary trial must remain the only Battle path requiring the full integration graph");
assert.match(facade, /return needsFullBattleIntegration\(runtime\) \? full\(\) : normalBattle\(\)/,
  "active Battle module selection must be explicit");
assert.match(prewarm, /safari-web-playable-integration\.js\?v=20260818-0800/,
  "post-render prewarm must target the cache-busted public Battle facade");
assert.match(prewarm, /prepareSafariBattleRuntime\(globalThis\.__maplessSafariRuntime\)/,
  "prewarm must ask the facade for the active Battle-specific runtime instead of importing full integration directly");
assert.doesNotMatch(prewarm, /import\("\.\/safari-playable-integration\.js"\)/,
  "normal Battle prewarm must not directly pull the full integration graph");
assert.match(html, /build 20260818-0800/);
assert.match(html, /safari-battle-runtime-prewarm\.js\?v=20260818-0800/);

console.log("Safari normal Battle -> minimal runtime graph: ok");
