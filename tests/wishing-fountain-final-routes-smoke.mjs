import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const sidecar = fs.readFileSync(path.join(root, "runtime", "safari-wishing-fountain-final-routes.js"), "utf8");
const touch = fs.readFileSync(path.join(root, "wishing-fountain-touch-presentation.js"), "utf8");
const lostBag = fs.readFileSync(path.join(root, "lost-bag-touch-presentation.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

assert.match(sidecar, /addPokemonRuntimeMaplessBonusStat/,
  "large bonus must reuse the shared Pokemon Runtime permanent-bonus owner");
assert.match(sidecar, /pokemon && !isEgg\(pokemon\)/,
  "bonus candidates must exclude eggs");
assert.doesNotMatch(sidecar, /pokemon && !isEgg\(pokemon\) && !isFainted\(pokemon\).*safariWishingFountainBonusCandidates/s,
  "bonus candidate projection must not exclude fainted Pokemon");
assert.match(sidecar, /resolveMaplessWishingFountainReachBattleTypeV108/,
  "reach Battle must use the source-verified event-local type resolver");
assert.match(sidecar, /resolveMaplessWishingFountainReachStatusV108/,
  "reach status must use the source-verified status resolver");
assert.match(sidecar, /registerSafariNormalEventBattleContinuation\("wishing_fountain"/,
  "reach Battle must return through the shared normal-event continuation owner");
assert.match(sidecar, /activateSafariNormalEventWildBattle/,
  "reach Battle must use the shared Safari normal-event wild Battle handoff");
assert.match(sidecar, /updatePokemonRuntime\(pokemon, \{ status, status_count:0 \}\)/,
  "reach status must mutate through Pokemon Runtime rather than a Safari-local status field");
assert.doesNotMatch(sidecar, /borrowSafariSharedRunRandomInt|Math\.random|crypto\.getRandomValues/,
  "reach action-time RNG must not drift onto shared/browser randomness");
assert.match(touch, /await resolveSafariWishingFountainInteraction/,
  "touch dispatch must await the Battle-capable final resolver");
assert.match(touch, /safariWishingFountainBonusCandidates/,
  "touch UI must select only candidates projected by the canonical bonus route");
assert.match(lostBag, /wishing-fountain-touch-presentation\.js\?v=20260826-0245/,
  "Safari loader sidecar must refresh the Wishing Fountain touch module");
assert.match(html, /lost-bag-touch-presentation\.js\?v=20260826-0245/,
  "Safari entry must refresh the outer touch-loader cache key");

console.log("Wishing Fountain final Safari routes/cache-chain smoke passed");
