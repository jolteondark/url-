import assert from "node:assert/strict";
import fs from "node:fs";

const consumer = fs.readFileSync(new URL("../trainer-battle-presentation.js", import.meta.url), "utf8");
const resolver = fs.readFileSync(new URL("../runtime/canonical-battle-ui-sources.js", import.meta.url), "utf8");

assert.match(consumer, /canonicalBattleUiAssetUrl/);
assert.match(consumer, /consumer:\s*["']trainer-party-pips["']/);
for (const filename of [
  "icon_ball.png",
  "icon_ball_empty.png",
  "icon_ball_faint.png",
  "icon_ball_status.png",
]) {
  assert.ok(consumer.includes(filename), `trainer party consumer must select ${filename}`);
  assert.ok(resolver.includes(filename), `shared resolver registry must include ${filename}`);
}
assert.match(consumer, /document\.createElement\(["']img["']\)/);
assert.ok(!consumer.includes('<span class="trainer-party-pip'), "trainer party must not render synthetic CSS pips");
assert.ok(!consumer.includes("assets/canonical-battle-ui"), "consumer must not hardcode canonical Battle UI asset paths");
assert.match(consumer, /if \(!src\) return null;/, "unresolved canonical icon must fail closed");

console.log("trainer party canonical ball icons smoke: PASS");
