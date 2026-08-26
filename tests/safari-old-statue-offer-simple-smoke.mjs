import assert from "node:assert/strict";
import fs from "node:fs";
import { resolveMaplessOldStatueOutcomeV108 } from "../runtime/mapless-old-statue-v108-inputs.js";
import {
  resolveSafariOldStatueInteraction,
  safariOldStatueOfferEntries,
} from "../runtime/safari-old-statue-offer-simple.js";

function findSample(predicate) {
  for (let normalSeed = 1; normalSeed < 256; normalSeed += 1) {
    for (let roll = 0; roll < 100; roll += 1) {
      const resolved = resolveMaplessOldStatueOutcomeV108({ normalSeed, roll, goodLimit:75, neutralLimit:95 });
      if (predicate(resolved, roll)) return { normalSeed, roll, resolved };
    }
  }
  return null;
}

function runtimeFor(sample) {
  const event = {
    kind:"normal_event",
    normal_event_id:"old_statue",
    normal_seed:sample.normalSeed,
    normal_data:{ offer_roll:sample.roll },
  };
  return {
    variables:{ mapless:{
      day:1,
      location:"day_board",
      board_events:[event],
      board_revealed:[true],
      board_visited:[true],
      board_consumed:[false],
      last_operations:[],
    } },
    bag:{ slots:[["POTION", 2]], money:0 },
    player:{ party:[] },
  };
}

const moneySample = findSample((resolved, roll) => roll >= 75 && roll < 95 && resolved.branch === "neutral" && resolved.effectIndex === 1);
assert.ok(moneySample, "expected a canonical Old Statue offer money sample");
const moneyRuntime = runtimeFor(moneySample);
assert.deepEqual(safariOldStatueOfferEntries(moneyRuntime, 0), [{ id:"POTION", qty:2 }]);
const moneyResult = await resolveSafariOldStatueInteraction(moneyRuntime, 0, "offer", { offeredItem:"POTION" });
assert.equal(moneyResult.completed, true);
assert.equal(moneyRuntime.bag.slots[0][0], "POTION");
assert.equal(moneyRuntime.bag.slots[0][1], 1);
assert.equal(moneyRuntime.bag.money, 300);
assert.equal(moneyRuntime.variables.mapless.board_consumed[0], true);
assert.ok(moneyResult.operations.some((operation) => operation?.op === "runtime_remove_item"));
assert.ok(moneyResult.operations.some((operation) => operation?.op === "runtime_add_money"));
assert.ok(moneyResult.operations.some((operation) => operation?.op === "request_save"));

const pendingSample = findSample((resolved, roll) => roll < 75 && resolved.branch === "good" && resolved.effectIndex === 1);
assert.ok(pendingSample, "expected a canonical unsupported Old Statue offer sample");
const pendingRuntime = runtimeFor(pendingSample);
const before = structuredClone(pendingRuntime);
const pendingResult = await resolveSafariOldStatueInteraction(pendingRuntime, 0, "offer", { offeredItem:"POTION" });
assert.equal(pendingResult.completed, false);
assert.match(pendingResult.result, /offer_owner_pending$/);
assert.deepEqual(pendingRuntime.bag, before.bag);
assert.equal(pendingRuntime.variables.mapless.board_consumed[0], false);

const cancelRuntime = runtimeFor(moneySample);
const cancelResult = await resolveSafariOldStatueInteraction(cancelRuntime, 0, "offer", { offeredItem:"" });
assert.equal(cancelResult.completed, false);
assert.equal(cancelRuntime.bag.slots[0][1], 2);
assert.equal(cancelRuntime.variables.mapless.board_consumed[0], false);

const runtimeSource = fs.readFileSync(new URL("../runtime/safari-old-statue-offer-simple.js", import.meta.url), "utf8");
const touchSource = fs.readFileSync(new URL("../old-statue-touch-presentation.js", import.meta.url), "utf8");
const loaderSource = fs.readFileSync(new URL("../lost-bag-touch-presentation.js", import.meta.url), "utf8");
const htmlSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
assert.match(runtimeSource, /resolveRewardTransaction/);
assert.match(runtimeSource, /costs:\[\{ item:offeredItem, quantity:1 \}\]/);
assert.match(runtimeSource, /supportedSimpleOutcome/);
assert.match(touchSource, /safari-old-statue-offer-simple\.js\?v=20260826-1105/);
assert.match(touchSource, /safariOldStatueOfferEntries/);
assert.match(loaderSource, /old-statue-touch-presentation\.js\?v=20260826-1105/);
assert.match(htmlSource, /lost-bag-touch-presentation\.js\?v=20260826-1105/);

console.log("safari old statue simple offer smoke: ok");
