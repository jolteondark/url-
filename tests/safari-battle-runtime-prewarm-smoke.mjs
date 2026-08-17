import assert from "node:assert/strict";
import fs from "node:fs";

const prewarm = fs.readFileSync(new URL("../runtime/safari-battle-runtime-prewarm.js", import.meta.url), "utf8");
const publicEntry = fs.readFileSync(new URL("../runtime/safari-web-playable-integration.js", import.meta.url), "utf8");
const preview = fs.readFileSync(new URL("../preview.js", import.meta.url), "utf8");
const previewApp = fs.readFileSync(new URL("../preview-app.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(html, /safari-battle-runtime-prewarm\.js\?v=20260818-0852/,
  "playable shell must fetch the fresh post-render Battle prewarm entry");
assert.match(preview, /preview-app\.js\?v=20260818-0852/,
  "playable boot must fetch a fresh preview-app module after Battle runtime changes");
assert.match(previewApp, /from "\.\/runtime\/safari-web-playable-integration\.js"/,
  "gameplay must use the shared unversioned lightweight Battle facade");
assert.match(prewarm, /import\("\.\/safari-web-playable-integration\.js"\)/,
  "prewarm must load the exact same facade URL used by gameplay, not a second query-versioned instance");
assert.doesNotMatch(prewarm, /safari-web-playable-integration\.js\?v=/,
  "prewarm must not create a duplicate facade module instance");
assert.match(prewarm, /window\.addEventListener\("safari-runtime-changed", schedulePrewarm/,
  "Battle state publication must schedule runtime prewarm");
assert.match(prewarm, /requestAnimationFrame\(\(\) => \{[\s\S]*prewarmAfterBattleRender\(\)/,
  "runtime prewarm must wait one render frame after Battle state publication");
assert.match(prewarm, /facadePromise = null;[\s\S]*throw error/,
  "a rejected facade prewarm promise must be retryable");
assert.match(prewarm, /facade\.prepareSafariBattleRuntime\(globalThis\.__maplessSafariRuntime\)/,
  "post-render prewarm must use the public runtime selector used by first-command resolution");
assert.match(prewarm, /__maplessLastError = error[\s\S]*__maplessBattleRuntimeError = error/,
  "a rejected prewarm must preserve the exact runtime error instead of masking it as UI state");
assert.match(publicEntry, /normalRoundModulePromise = import\("\.\/safari-normal-battle-round\.js\?v=20260818-0852"\)/,
  "ordinary wild/trainer first-command runtime must use the fresh direct normal owner URL");
assert.match(publicEntry, /prepareSafariBattleRuntime\(runtime = globalThis\.__maplessSafariRuntime\)[\s\S]*else await normalRound\(\)/,
  "prewarm must prepare the same direct normal owner used by ordinary move resolution");
assert.match(publicEntry, /resolveSafariBattleRound\(runtime, selectedMoveId\)[\s\S]*resolveSafariNormalBattleRound\(runtime, selectedMoveId\)/,
  "ordinary first-command resolution must consume the direct normal owner");
assert.match(publicEntry, /needsFullBattleIntegration\(runtime\)[\s\S]*origin === "boundary_trial"/,
  "only boundary trials should require the full Battle integration graph");
assert.doesNotMatch(publicEntry, /normalBattleModulePromise = import\("\.\/safari-playable-integration-pre-wounded\.js"\)/,
  "the obsolete normal Battle migration-chain loader must not return");

console.log("Safari Battle scene -> shared facade prewarm -> fresh direct normal first command: ok");
