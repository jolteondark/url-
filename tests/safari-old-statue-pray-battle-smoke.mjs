import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const sidecar = fs.readFileSync(path.join(root, "runtime", "safari-old-statue-pray-battle.js"), "utf8");
const touch = fs.readFileSync(path.join(root, "old-statue-touch-presentation.js"), "utf8");
const loader = fs.readFileSync(path.join(root, "lost-bag-touch-presentation.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

assert.match(sidecar, /resolved\.branch === "neutral" && resolved\.effectIndex === 0/,
  "Old Statue pray Battle must remain the canonical neutral/effect 0 route");
assert.match(sidecar, /selectMaplessOldStatueBattleTypeV108/,
  "Battle type must use the source-owned shared/global sample boundary");
assert.match(sidecar, /borrowSafariSharedRunRandomInt/,
  "Battle type selection must use persisted shared run RNG");
assert.match(sidecar, /activateSafariNormalEventWildBattle/,
  "pray Battle must reuse the shared Safari normal-event Battle handoff");
assert.match(sidecar, /registerSafariNormalEventBattleContinuation\("old_statue"/,
  "Battle return must use the shared normal-event continuation owner");
assert.match(sidecar, /state\.preview_encounter_counter = counter/,
  "failed Battle handoff must roll shared RNG back");
assert.doesNotMatch(sidecar, /Math\.random|new RubyMT19937Random/,
  "Factory must not invent Old Statue RNG");
assert.match(touch, /safari-old-statue-pray-battle\.js\?v=20260826-0755/);
assert.match(loader, /old-statue-touch-presentation\.js\?v=20260826-0755/);
assert.match(html, /lost-bag-touch-presentation\.js\?v=20260826-0755/,
  "outer Safari entry must refresh so #878 and this sidecar are physically reachable");

console.log("Safari Old Statue pray wild Battle wiring smoke passed");
