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
  previewSource,
  /canonical-battle-battler-assets\.js\?v=20260906-0500/,
  "public preview must request the post-#1261 canonical battler adapter generation",
);
assert.doesNotMatch(
  previewSource,
  /canonical-battle-battler-assets\.js\?v=20260905-1000/,
  "public preview must not retain the stale pre-#1261 canonical battler adapter generation",
);

console.log("canonical Battle battler load fail-closed smoke: ok");
