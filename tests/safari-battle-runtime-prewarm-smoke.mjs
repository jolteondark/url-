import assert from "node:assert/strict";
import fs from "node:fs";

const prewarm = fs.readFileSync(new URL("../runtime/safari-battle-runtime-prewarm.js", import.meta.url), "utf8");
const publicEntry = fs.readFileSync(new URL("../runtime/safari-web-playable-integration.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(
  html,
  /safari-battle-runtime-prewarm\.js\?v=/,
  "the post-render Battle runtime prewarm entry must be loaded from the playable shell",
);
assert.match(
  prewarm,
  /window\.addEventListener\("safari-runtime-changed", schedulePrewarm/,
  "Battle state publication must schedule runtime prewarm",
);
assert.match(
  prewarm,
  /requestAnimationFrame\(\(\) => \{[\s\S]*prewarmAfterBattleRender\(\)/,
  "runtime prewarm must wait one render frame after Battle state publication",
);
assert.match(
  prewarm,
  /import\("\.\/safari-web-playable-integration\.js\?v=[^\"]+"\)/,
  "prewarm must load the lightweight Battle facade rather than the full integration graph directly",
);
assert.match(
  prewarm,
  /facadePromise = null;[\s\S]*throw error/,
  "a rejected facade prewarm promise must be retryable",
);
assert.match(
  prewarm,
  /facade\.prepareSafariBattleRuntime\(globalThis\.__maplessSafariRuntime\)/,
  "post-render prewarm must delegate runtime selection to the shared Battle facade",
);
assert.match(
  prewarm,
  /__maplessLastError = error[\s\S]*__maplessBattleRuntimeError = error/,
  "a rejected prewarm must preserve the exact runtime error instead of masking it as UI state",
);
assert.doesNotMatch(
  prewarm,
  /import\("\.\/safari-playable-integration\.js"\)/,
  "normal Battle prewarm must not eagerly import the full integration graph",
);
assert.match(
  publicEntry,
  /normalBattleModulePromise = import\("\.\/safari-playable-integration-pre-wounded\.js"\)/,
  "ordinary wild/trainer rounds must use the isolated normal Battle runtime",
);
assert.match(
  publicEntry,
  /needsFullBattleIntegration\(runtime\)[\s\S]*origin === "boundary_trial"/,
  "only boundary trials should require the full Battle integration graph",
);
assert.match(
  publicEntry,
  /prepareSafariBattleRuntime\(runtime = globalThis\.__maplessSafariRuntime\)[\s\S]*await battleModule\(runtime\)/,
  "prewarm and first-command resolution must share the same Battle runtime selector",
);
assert.doesNotMatch(
  publicEntry,
  /event\?\.kind === "wild"[\s\S]*await full\(\)[\s\S]*activateSafariWebCombatCell/,
  "Board combat activation must stay on the lightweight combat-start path",
);

console.log("Safari Battle scene -> post-render selected runtime prewarm -> retryable first command: ok");
