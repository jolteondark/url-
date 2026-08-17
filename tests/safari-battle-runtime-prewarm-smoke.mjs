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
  /import\("\.\/safari-playable-integration\.js"\)/,
  "prewarm must target the exact full Battle integration URL used by move resolution",
);
assert.match(
  prewarm,
  /__maplessLastError = error[\s\S]*__maplessBattleRuntimeError = error/,
  "a rejected prewarm must preserve the exact runtime error instead of masking it as UI state",
);
assert.match(
  prewarm,
  /runtimeModulePromise = null;[\s\S]*throw error/,
  "a rejected prewarm promise must be retryable",
);
assert.doesNotMatch(
  publicEntry,
  /event\?\.kind === "wild"[\s\S]*await full\(\)[\s\S]*activateSafariWebCombatCell/,
  "Board combat activation must stay on the lightweight combat-start path",
);
assert.match(
  publicEntry,
  /fullModulePromise = null;[\s\S]*__maplessLastError = error[\s\S]*throw error/,
  "the shared full-runtime loader must also clear rejected promises and retain the exact error",
);

console.log("Safari Battle scene -> post-render full runtime prewarm -> retryable move runtime: ok");
