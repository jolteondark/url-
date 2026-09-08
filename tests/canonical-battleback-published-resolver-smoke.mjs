import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  canonicalBattlebackMissingNames,
  canonicalBattlebackPublishedPath,
} from "../runtime/canonical-battleback-sources.js";

const published = [
  "field_bg.png", "field_base0.png", "field_base1.png",
  "field_eve_bg.png", "field_eve_base0.png", "field_eve_base1.png",
  "field_night_bg.png", "field_night_base0.png", "field_night_base1.png",
  "field_message.png",
];

assert.deepEqual(canonicalBattlebackMissingNames(), []);
for (const name of published) {
  assert.equal(
    canonicalBattlebackPublishedPath(name),
    `assets/canonical-battlebacks/${name}`,
    `${name} must resolve only through the shared published resolver`,
  );
}
assert.equal(canonicalBattlebackPublishedPath("FIELD_BG.PNG"), null, "exact-case lookup must fail closed");
assert.equal(canonicalBattlebackPublishedPath("missing.png"), null, "unknown battlebacks must fail closed");

const bridge = await readFile(new URL("../canonical-battleback-presentation-bridge.js", import.meta.url), "utf8");
assert.match(bridge, /canonical-battleback-sources\.js\?v=20260909-0015/);

const loader = await readFile(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");
assert.match(loader, /BATTLE_PRESENTATION_PUBLIC_REVISION = "20260909-0015"/);
assert.match(loader, /canonical-battleback-presentation-bridge\.js/);

console.log("canonical battleback published resolver smoke: ok");
