import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const owner = fs.readFileSync(path.join(root, "runtime", "safari-old-statue-pray-power-meal.js"), "utf8");
const touch = fs.readFileSync(path.join(root, "old-statue-touch-presentation.js"), "utf8");
const loader = fs.readFileSync(path.join(root, "lost-bag-touch-presentation.js"), "utf8");

assert.match(owner, /resolved\.branch === "good" && resolved\.effectIndex === 5/,
  "Old Statue one-Battle power must remain canonical good/effect 5 only");
assert.match(owner, /setSafariPowerMeal\(runtime, 1\)/,
  "Old Statue power result must reuse the shared one-Battle power meal owner");
assert.match(owner, /resolveOldStatue\(\{[\s\S]*?choice:"pray"/,
  "Old Statue power result must still complete through the canonical resolver");
assert.match(owner, /request_save[\s\S]*?old_statue_resolved/,
  "Old Statue power result must request persistence through the existing lifecycle");
assert.doesNotMatch(owner, /ATTACK|SPECIAL_ATTACK|stat_stages/,
  "Factory must not duplicate Battle power-meal mechanics");
assert.match(touch, /safari-old-statue-pray-power-meal\.js\?v=20260826-0705/,
  "live Old Statue touch owner must load the power-meal sidecar with a fresh key");
assert.match(loader, /old-statue-touch-presentation\.js\?v=20260826-0705/,
  "upstream Safari loader must refresh the Old Statue touch module");

console.log("Safari Old Statue pray one-Battle power meal wiring smoke passed");
