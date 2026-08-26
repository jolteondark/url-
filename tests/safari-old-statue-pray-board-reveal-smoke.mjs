import assert from "node:assert/strict";
import fs from "node:fs";
import { resolveOldStatue } from "../runtime/mapless-old-statue-flow.js";
import { resolveMaplessOldStatueOutcomeV108 } from "../runtime/mapless-old-statue-v108-inputs.js";

let sample = null;
for (let normalSeed = 1; normalSeed < 256 && !sample; normalSeed += 1) {
  for (let roll = 0; roll < 50; roll += 1) {
    const resolved = resolveMaplessOldStatueOutcomeV108({ normalSeed, roll, goodLimit:50, neutralLimit:80 });
    if (resolved.branch === "good" && resolved.effectIndex === 4) {
      sample = { normalSeed, roll, resolved };
      break;
    }
  }
}
assert.ok(sample, "expected a canonical Old Statue board-reveal sample");
const canonical = resolveOldStatue({
  event:{ kind:"normal_event", normal_event_id:"old_statue", normal_seed:sample.normalSeed, normal_data:{ pray_roll:sample.roll } },
  choice:"pray",
  outcome:{ effect_index:sample.resolved.effectIndex, status:sample.resolved.status },
});
assert.ok(canonical.operations.some((operation) => operation?.op === "reveal_random_board_cell"));
assert.equal(canonical.event.normal_resolved, true);

const runtimeSource = fs.readFileSync(new URL("../runtime/safari-old-statue-pray-board-reveal.js", import.meta.url), "utf8");
const touchSource = fs.readFileSync(new URL("../old-statue-touch-presentation.js", import.meta.url), "utf8");
const loaderSource = fs.readFileSync(new URL("../lost-bag-touch-presentation.js", import.meta.url), "utf8");

assert.match(runtimeSource, /resolved\.branch === "good" && resolved\.effectIndex === 4/);
assert.match(runtimeSource, /index === currentIndex/);
assert.match(runtimeSource, /state\.board_revealed\?\.\[index\] \|\| state\.board_consumed\?\.\[index\]/);
assert.match(runtimeSource, /borrowSafariSharedRunRandomInt\(runtime, eligible\.length\)/);
assert.match(runtimeSource, /state\.preview_encounter_counter = counter/);
assert.match(runtimeSource, /state\.board_revealed\[revealIndex\] = true/);
assert.match(runtimeSource, /runtime_reveal_board_cell/);
assert.match(runtimeSource, /request_save/);
assert.match(touchSource, /safari-old-statue-pray-board-reveal\.js\?v=20260826-1005/);
assert.match(loaderSource, /old-statue-touch-presentation\.js\?v=20260826-1005/);

console.log("safari old statue pray board reveal smoke: ok");
