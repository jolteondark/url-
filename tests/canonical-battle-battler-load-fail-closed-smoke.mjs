import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../runtime/canonical-battle-battler-assets.js", import.meta.url),
  "utf8",
);
const previewSource = readFileSync(
  new URL("../preview.js", import.meta.url),
  "utf8",
);
const indexSource = readFileSync(
  new URL("../index.html", import.meta.url),
  "utf8",
);

assert.match(
  source,
  /image\.hidden = true;[\s\S]*?image\.addEventListener\("load", \(\) => \{[\s\S]*?image\.hidden = false;/,
  "canonical battler image must stay hidden until its load event completes",
);
assert.match(
  source,
  /image\.addEventListener\("error", \(\) => \{[\s\S]*?image\.remove\(\);[\s\S]*?canonicalBattleSprite = "error"/,
  "canonical battler load failure must remain fail-closed and diagnosable",
);
assert.match(
  source,
  /#battle-card \.text-mon\[data-canonical-battle-sprite\][\s\S]*?opacity:\s*1\s*!important/,
  "loaded canonical battlers must override the legacy placeholder opacity instead of rendering at 18% opacity",
);
assert.match(
  previewSource,
  /canonical-battle-battler-assets\.js\?v=20260906-1500/,
  "public preview must request the full-opacity canonical battler adapter generation",
);
assert.doesNotMatch(
  previewSource,
  /canonical-battle-battler-assets\.js\?v=20260906-0500/,
  "public preview must not retain the faded canonical battler adapter generation",
);
assert.match(
  indexSource,
  /preview\.js\?v=20260906-1530/,
  "outer Safari/Web entry must publish the preview generation that imports the full-opacity battler adapter",
);
assert.doesNotMatch(
  indexSource,
  /preview\.js\?v=20260906-1430/,
  "outer Safari/Web entry must not retain the pre-full-opacity preview generation",
);

console.log("canonical Battle battler load fail-closed smoke: ok");
