import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../battle-dppt-ui.css", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(
  css,
  /#battle-card \.battle-topline,#battle-card #turn,#battle-card #battle-phase\{display:none!important\}/,
  "reachable Battle presentation must not expose the synthetic Battle/Turn header above the canonical scene",
);
assert.match(
  index,
  /battle-dppt-ui\.css\?v=20260905-1700/,
  "public Safari entry must request the refreshed Battle presentation stylesheet generation",
);
assert.doesNotMatch(
  index,
  /battle-dppt-ui\.css\?v=20260902-0208/,
  "public Safari entry must not retain the stale Battle presentation stylesheet generation",
);

console.log("canonical Battle header presentation smoke: ok");
