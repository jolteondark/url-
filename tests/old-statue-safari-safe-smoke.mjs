import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const owner = fs.readFileSync(path.join(root, "runtime", "safari-old-statue-interaction.js"), "utf8");
const touch = fs.readFileSync(path.join(root, "old-statue-touch-presentation.js"), "utf8");
const loader = fs.readFileSync(path.join(root, "lost-bag-touch-presentation.js"), "utf8");

assert.match(owner, /resolveMaplessOldStatueOutcomeV108/, "pray outcomes must use the source-owned v0.9.108 resolver");
assert.match(owner, /resolveMaplessNormalEventMediumReward/, "medium reward must reuse the shared reward owner");
assert.match(owner, /borrowSafariSharedRunRandomInt/, "caller-owned global reward draw must use persisted shared run RNG");
assert.match(owner, /healSafariPartyFull/, "full heal must reuse Pokemon Runtime healing owner");
assert.match(owner, /damageSafariPokemonPercent/, "party damage must reuse Pokemon Runtime damage owner");
assert.match(owner, /inflictSafariOverworldStatus/, "status must reuse Pokemon Runtime status owner");
assert.doesNotMatch(owner, /new RubyMT19937Random|Math\.random/, "Safari adapter must not invent Old Statue RNG");
assert.match(owner, /old_statue_offer_owner_pending/, "unwired offer must fail closed without consuming the event");
assert.match(owner, /old_statue_break_owner_pending/, "unwired break must fail closed without consuming the event");
assert.match(touch, /normal_event_id === "old_statue"/, "Day Board touch sidecar must own old_statue");
assert.match(touch, /saveSafariPlayableRun/, "completed Old Statue routes must persist through shared save owner");
assert.match(loader, /old-statue-touch-presentation\.js\?v=20260826-0345/, "live Safari loader chain must include the Old Statue sidecar");

console.log("old-statue-safari-safe-smoke: ok");
