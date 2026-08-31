import assert from "node:assert/strict";
import fs from "node:fs";
import { canonicalBattleUiAssetUrl } from "../runtime/canonical-battle-ui-sources.js";

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
  const url = canonicalBattleUiAssetUrl(filename, { consumer: "trainer-party-pips" });
  assert.ok(url, `${filename} must resolve through the shared URL adapter`);
  const pathname = new URL(url).pathname;
  assert.ok(pathname.endsWith(`/assets/canonical-battle-ui/${filename}`), `${filename} must keep the exact case-sensitive asset path`);
  assert.ok(!pathname.includes("/runtime/assets/"), `${filename} must not resolve relative to the runtime directory`);
}
assert.equal(canonicalBattleUiAssetUrl("not_published.png", { consumer: "trainer-party-pips" }), null, "unpublished assets must fail closed");
assert.match(consumer, /document\.createElement\(["']img["']\)/);
assert.ok(!consumer.includes('<span class="trainer-party-pip'), "trainer party must not render synthetic CSS pips");
assert.ok(!consumer.includes("assets/canonical-battle-ui"), "consumer must not hardcode canonical Battle UI asset paths");
assert.match(consumer, /if \(!src\) return null;/, "unresolved canonical icon must fail closed");

console.log("trainer party canonical ball icons smoke: PASS");
