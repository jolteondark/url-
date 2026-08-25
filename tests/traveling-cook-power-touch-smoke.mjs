import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const touch = fs.readFileSync(path.join(root, "traveling-cook-power-presentation.js"), "utf8");

assert.match(html, /traveling-cook-power-presentation\.js\?v=20260825-2200/,
  "Safari entry must load the power-meal touch adapter with a fresh cache key");
assert.match(touch, /safari-traveling-cook-interaction\.js\?v=20260825-2200/,
  "power touch must bypass any cached pre-#842 Traveling Cook owner");
assert.match(touch, /data-normal-event-action|dataset\.normalEventAction/);
assert.match(touch, /"pay:power"/,
  "paid power meal must be visible in the normal-event action surface");
assert.match(touch, /"berries:power"/,
  "berry-paid power meal must be visible in the normal-event action surface");
assert.match(touch, /stopImmediatePropagation\(\)/,
  "power clicks must not fall through to the older generic normal-event click handler");
assert.match(touch, /resolveSafariTravelingCookInteraction\(current, active\.boardIndex, action, "power"\)/,
  "touch adapter must dispatch directly to the post-#842 canonical power route");
assert.match(touch, /saveSafariPlayableRun/,
  "completed power meal must use the existing Safari persistence owner");

console.log("Traveling Cook power touch/cache wiring smoke passed");
