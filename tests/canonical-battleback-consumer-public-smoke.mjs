import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CANONICAL_BATTLEBACK_VARIANTS,
  resolveCanonicalBattlebackAssets,
} from "../runtime/canonical-battleback-assets.js";

assert.deepEqual(resolveCanonicalBattlebackAssets("DAY"), CANONICAL_BATTLEBACK_VARIANTS.day);
assert.deepEqual(resolveCanonicalBattlebackAssets("EVE"), CANONICAL_BATTLEBACK_VARIANTS.eve);
assert.deepEqual(resolveCanonicalBattlebackAssets("NIGHT"), CANONICAL_BATTLEBACK_VARIANTS.night);
assert.equal(resolveCanonicalBattlebackAssets(null), null, "Presentation must fail closed without owner timeOfDay");

for (const variant of Object.values(CANONICAL_BATTLEBACK_VARIANTS)) {
  for (const src of Object.values(variant)) {
    const diskPath = new URL(`../${src.replace(/^\.\//, "")}`, import.meta.url);
    assert.ok(fs.existsSync(diskPath), `published canonical Battleback missing: ${src}`);
  }
}

const presentation = fs.readFileSync(new URL("../runtime/canonical-battleback-presentation.js", import.meta.url), "utf8");
assert.match(presentation, /resolveCanonicalBattlebackAssets\(timeOfDay\)/);
assert.match(presentation, /battle\.timeOfDay/);
assert.match(presentation, /rememberCanonicalBattlebackDiagnostic/);
assert.match(presentation, /Promise\.all/);
assert.match(presentation, /data-canonical-battleback="ready"/);
assert.doesNotMatch(presentation, /new Date\s*\(/, "Presentation consumer must not own time-of-day truth");

const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
for (const modulePath of [
  "./runtime/battle-initial-entry-weather-commit.js?v=20260910-1901",
  "./runtime/battle-start-time-of-day.js?v=20260910-1901",
  "./runtime/canonical-battleback-assets.js?v=20260910-1901",
  "./runtime/canonical-battleback-presentation.js?v=20260910-1901",
  "./canonical-battleback-presentation.js?v=20260910-1901",
]) {
  assert.ok(index.includes(modulePath), `Safari public generation missing: ${modulePath}`);
}
assert.ok(index.includes("./runtime/safari-berry-thief-interaction.js?v=20260910-1901"), "Berry Thief #1453 must be served from the refreshed public generation");
assert.ok(!index.includes("./runtime/safari-berry-thief-interaction.js?v=20260905-0930"), "Berry Thief stale public generation must not remain served");

console.log("canonical Battleback consumer public smoke: ok");
