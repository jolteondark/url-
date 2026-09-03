import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const adapter = fs.readFileSync(path.join(root, "runtime", "safari-sleeping-giant-interaction.js"), "utf8");

assert.match(
  adapter,
  /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/,
  "Sleeping Giant must settle Bag mutations through the shared Safari Bag/Economy receipt owner",
);
assert.doesNotMatch(
  adapter,
  /runtime\.bag\.slots\s*=/,
  "Sleeping Giant must not replace Safari Bag slots directly",
);

const continuationStart = adapter.indexOf('registerSafariNormalEventBattleContinuation("sleeping_giant"');
const interactionStart = adapter.indexOf("export async function resolveSafariSleepingGiantInteraction");
assert.ok(continuationStart >= 0 && interactionStart > continuationStart, "Sleeping Giant continuation block must exist");
const continuation = adapter.slice(continuationStart, interactionStart);

const consumedGuard = continuation.indexOf("if (alreadyConsumed(state, index, event))");
const rewardAttempt = continuation.indexOf("const rewardAttempt = success ? reward(runtime, item) : null;");
assert.ok(consumedGuard >= 0 && consumedGuard < rewardAttempt, "duplicate RETURN must fail closed before reward projection or mutation");
assert.match(
  continuation,
  /result:"already_consumed",[\s\S]*?operations:\[\],[\s\S]*?persistenceRequested:false/,
  "duplicate RETURN must be terminal without Bag, Board, or Persistence mutations",
);
assert.match(
  continuation,
  /const receipt = success \? commitSafariBagEconomyReceipt\(runtime, \{ reward:rewardAttempt \}\) : null;/,
  "successful post-Battle reward must use the shared receipt owner",
);
assert.match(
  continuation,
  /receipt\?\.operations/,
  "post-Battle operations must come from the shared receipt",
);

console.log("Sleeping Giant exactly-once smoke passed");
