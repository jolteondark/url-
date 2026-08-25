import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const sidecar = fs.readFileSync(path.join(root, "runtime", "safari-old-statue-break-safe.js"), "utf8");
const touch = fs.readFileSync(path.join(root, "old-statue-touch-presentation.js"), "utf8");
const loader = fs.readFileSync(path.join(root, "lost-bag-touch-presentation.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

assert.match(sidecar, /selectMaplessOldStatueMineralV108/, "mineral selection must use the canonical v0.9.108 owner");
assert.match(sidecar, /resolveMaplessNormalEventLargeReward/, "old offering must use the shared large reward owner");
assert.match(sidecar, /resolveRewardTransaction/, "mineral grant must use the shared Bag transaction owner");
assert.match(sidecar, /borrowSafariSharedRunRandomInt/, "caller-owned mineral and large reward draws must use shared run RNG");
assert.match(sidecar, /damageSafariPokemonPercent/, "collapse damage must reuse the Pokemon Runtime damage owner");
assert.match(sidecar, /old_statue_guardian_battle_pending/, "guardian Battle must remain fail-closed until shared continuation is wired");
assert.doesNotMatch(sidecar, /Math\.random|new RubyMT19937Random/, "Safari sidecar must not invent Old Statue RNG");
assert.match(touch, /safari-old-statue-break-safe\.js\?v=20260826-0445/);
assert.match(loader, /old-statue-touch-presentation\.js\?v=20260826-0445/);
assert.match(html, /lost-bag-touch-presentation\.js\?v=20260826-0445/);

console.log("Old Statue safe break Safari hookup smoke passed");
