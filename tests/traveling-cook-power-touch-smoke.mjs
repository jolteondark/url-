import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const touch = fs.readFileSync(path.join(root, "traveling-cook-power-presentation.js"), "utf8");

assert.match(html, /traveling-cook-power-presentation\.js\?v=20260828-2140/,
  "Safari entry must load the post-#981 power/prototype touch adapter with a fresh cache key");
assert.doesNotMatch(html, /traveling-cook-power-presentation\.js\?v=20260825-2200/,
  "Safari entry must not retain the pre-#981 power/prototype touch adapter cache key");
assert.match(touch, /safari-traveling-cook-interaction\.js\?v=20260828-2140/,
  "power/prototype touch must fetch the post-#981 Traveling Cook owner");
assert.doesNotMatch(touch, /safari-traveling-cook-interaction\.js\?v=20260825-2200/,
  "power/prototype touch must not re-enter the pre-#981 owner generation");
assert.match(touch, /data-normal-event-action|dataset\.normalEventAction/);
assert.match(touch, /"pay:power"/,
  "paid power meal must be visible in the normal-event action surface");
assert.match(touch, /"berries:power"/,
  "berry-paid power meal must be visible in the normal-event action surface");
assert.match(touch, /button\[data-normal-event-action=\\?"prototype\\?"\]/,
  "prototype choice must be intercepted by the fresh Traveling Cook touch adapter");
assert.match(touch, /resolveSafariTravelingCookInteraction\(current, active\.boardIndex, "prototype"\)/,
  "prototype must dispatch through the post-#981 owner so non-power prototype outcomes cannot use a stale base adapter");
assert.match(touch, /stopImmediatePropagation\(\)/,
  "power/prototype clicks must not fall through to the generic normal-event click handler");
assert.match(touch, /resolveSafariTravelingCookInteraction\(current, active\.boardIndex, action, "power"\)/,
  "touch adapter must dispatch directly to the canonical power route");
assert.match(touch, /saveSafariPlayableRun/,
  "completed power meal must use the existing Safari persistence owner");

console.log("Traveling Cook power/prototype post-#981 cache wiring smoke passed");
