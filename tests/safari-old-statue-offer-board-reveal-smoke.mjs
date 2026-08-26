import assert from "node:assert/strict";
import fs from "node:fs";
import { resolveMaplessOldStatueOutcomeV108 } from "../runtime/mapless-old-statue-v108-inputs.js";
import { resolveSafariOldStatueInteraction } from "../runtime/safari-old-statue-offer-board-reveal.js";

function findSample() {
  for (let normalSeed = 1; normalSeed < 256; normalSeed += 1) {
    for (let roll = 0; roll < 75; roll += 1) {
      const resolved = resolveMaplessOldStatueOutcomeV108({ normalSeed, roll, goodLimit:75, neutralLimit:95 });
      if (resolved.branch === "good" && resolved.effectIndex === 4) return { normalSeed, roll };
    }
  }
  return null;
}

const sample = findSample();
assert.ok(sample, "expected canonical Old Statue offer board-reveal sample");
const statue = { kind:"normal_event", normal_event_id:"old_statue", normal_seed:sample.normalSeed, normal_data:{ offer_roll:sample.roll } };
const hidden = { kind:"normal_event", normal_event_id:"berry_thief", normal_seed:99, normal_data:{} };
const runtime = {
  variables:{ mapless:{
    day:1,
    location:"day_board",
    board_events:[statue, hidden],
    board_revealed:[true, false],
    board_visited:[true, false],
    board_consumed:[false, false],
    last_operations:[],
    preview_encounter_seed:12345,
    preview_encounter_counter:0,
  } },
  bag:{ slots:[["POTION", 2]], money:0 },
  player:{ party:[] },
};
const result = await resolveSafariOldStatueInteraction(runtime, 0, "offer", { offeredItem:"POTION" });
assert.equal(result.completed, true);
assert.equal(runtime.bag.slots[0][1], 1);
assert.equal(runtime.variables.mapless.board_consumed[0], true);
assert.equal(runtime.variables.mapless.board_revealed[1], true);
assert.ok(result.operations.some((operation) => operation?.op === "runtime_remove_item"));
assert.ok(result.operations.some((operation) => operation?.op === "runtime_reveal_board_cell" && operation.board_index === 1));
assert.ok(result.operations.some((operation) => operation?.op === "request_save"));

const noTarget = {
  variables:{ mapless:{
    day:1,
    location:"day_board",
    board_events:[structuredClone(statue)],
    board_revealed:[true],
    board_visited:[true],
    board_consumed:[false],
    last_operations:[],
    preview_encounter_seed:12345,
    preview_encounter_counter:7,
  } },
  bag:{ slots:[["POTION", 2]], money:0 },
  player:{ party:[] },
};
const pending = await resolveSafariOldStatueInteraction(noTarget, 0, "offer", { offeredItem:"POTION" });
assert.equal(pending.completed, false);
assert.equal(noTarget.bag.slots[0][1], 2);
assert.equal(noTarget.variables.mapless.preview_encounter_counter, 7);
assert.equal(noTarget.variables.mapless.board_consumed[0], false);

const touchSource = fs.readFileSync(new URL("../old-statue-touch-presentation.js", import.meta.url), "utf8");
const loaderSource = fs.readFileSync(new URL("../lost-bag-touch-presentation.js", import.meta.url), "utf8");
const htmlSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
assert.match(touchSource, /safari-old-statue-offer-board-reveal\.js\?v=20260826-1200/);
assert.match(loaderSource, /old-statue-touch-presentation\.js\?v=20260826-1200/);
assert.match(htmlSource, /lost-bag-touch-presentation\.js\?v=20260826-1200/);

console.log("safari old statue offer board reveal smoke: ok");
