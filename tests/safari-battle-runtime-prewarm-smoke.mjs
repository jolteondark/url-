import assert from "node:assert/strict";
import fs from "node:fs";

const prewarm = fs.readFileSync(new URL("../runtime/safari-battle-runtime-prewarm.js", import.meta.url), "utf8");
const publicEntry = fs.readFileSync(new URL("../runtime/safari-web-playable-integration.js", import.meta.url), "utf8");
const previewApp = fs.readFileSync(new URL("../preview-app.js", import.meta.url), "utf8");

assert.match(previewApp, /from "\.\/runtime\/safari-web-playable-integration\.js"/,
  "gameplay must use the shared lightweight Battle facade");
assert.match(prewarm, /import\("\.\/safari-web-playable-integration\.js"\)/,
  "boundary prewarm must load the same shared facade URL rather than a duplicate query-versioned instance");
assert.doesNotMatch(prewarm, /safari-web-playable-integration\.js\?v=/,
  "prewarm must not create a duplicate facade module instance");
assert.match(prewarm, /window\.addEventListener\("safari-runtime-changed", schedulePrewarm/,
  "Battle state publication must schedule boundary-capable runtime readiness");
assert.match(prewarm, /requestAnimationFrame\(\(\) => \{[\s\S]*prewarmAfterBattleRender\(\)/,
  "runtime readiness check must wait one render frame after Battle state publication");
assert.match(prewarm, /facadePromise = null;[\s\S]*throw error/,
  "a rejected facade prewarm promise must be retryable");
assert.match(prewarm, /facade\.prepareSafariBattleRuntime\(globalThis\.__maplessSafariRuntime\)/,
  "post-render readiness must use the public runtime selector");
assert.match(prewarm, /__maplessLastError = error[\s\S]*__maplessBattleRuntimeError = error/,
  "a rejected prewarm must preserve the exact runtime error instead of masking it as UI state");

assert.match(publicEntry, /import \{ resolveSafariNormalBattleRound \} from "\.\/safari-normal-battle-round\.js";/,
  "ordinary wild/trainer rounds must be imported before first-command interaction");
assert.match(publicEntry, /from "\.\/safari-normal-battle-lifecycle\.js";/,
  "ordinary capture/return lifecycle must be imported before interaction");
assert.doesNotMatch(publicEntry, /normalRoundModulePromise|normalLifecycleModulePromise/,
  "ordinary Battle must not retain command-time dynamic module promises");
assert.match(publicEntry, /prepareSafariBattleRuntime\(runtime = globalThis\.__maplessSafariRuntime\)[\s\S]*if \(needsFullBattleIntegration\(runtime\)\) await full\(\);[\s\S]*return true/,
  "ordinary Battle readiness must already be true; only boundary Battle may require delayed full integration");
assert.match(publicEntry, /resolveSafariBattleRound\(runtime, selectedMoveId\)[\s\S]*resolveSafariNormalBattleRound\(runtime, selectedMoveId\)/,
  "ordinary first-command resolution must call the eager direct normal owner");
assert.match(publicEntry, /needsFullBattleIntegration\(runtime\)[\s\S]*origin === "boundary_trial"/,
  "only boundary trials should require the full Battle integration graph");
assert.doesNotMatch(publicEntry, /safari-playable-integration-pre-wounded\.js/,
  "the obsolete normal Battle migration-chain loader must not return");

console.log("Safari Battle scene -> eager normal runtime; post-render prewarm reserved for boundary-capable full integration: ok");
