import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveSafariItemCollectorInteraction,
  safariItemCollectorOwnedEntries,
  safariItemCollectorPresentation,
} from "../runtime/safari-item-collector-interaction.js";

function runtimeWith(slots = [["POKEBALL", 1]]) {
  return {
    bag:{ slots:structuredClone(slots), money:0 },
    variables:{ mapless:{
      location:"day_board",
      board_events:[{ kind:"normal_event", normal_event_id:"item_collector", normal_seed:1, normal_data:{} }],
      board_revealed:[false], board_visited:[false], board_consumed:[false], last_operations:[], notice:"",
    } },
  };
}

const runtime = runtimeWith();
const initial = safariItemCollectorPresentation(runtime, 0);
assert.deepEqual(initial.actions.map((action) => action.id), ["category:ball", "category:medicine", "leave"]);
const owned = safariItemCollectorOwnedEntries(runtime, 0, "ball");
assert.ok(owned.some((entry) => entry.id === "POKEBALL" && entry.qty === 1));
assert.equal(safariItemCollectorOwnedEntries(runtime, 0, "medicine").length, 0);

const exchange = resolveSafariItemCollectorInteraction(runtime, 0, "exchange:ball:POKEBALL");
assert.equal(exchange.completed, true);
assert.equal(exchange.result, "exchanged");
assert.equal(runtime.variables.mapless.board_consumed[0], true);
assert.equal(runtime.bag.slots.some((slot) => slot?.[0] === "POKEBALL"), false,
  "successful exchange must consume exactly one offered item");
assert.ok(runtime.bag.slots.some((slot) => slot?.[0] === exchange.rewardItem && Number(slot?.[1]) === 1),
  "canonical selected reward must reach runtime Bag");
assert.ok(exchange.operations.some((operation) => operation.op === "upgrade_roll"));
assert.ok(exchange.operations.some((operation) => operation.op === "select_reward"));
assert.ok(exchange.operations.some((operation) => operation.op === "request_save"));

const fullSlots = Array.from({ length:20 }, (_, index) => [`FILLER${index}`, 1]);
fullSlots[0] = ["POKEBALL", 1];
const full = runtimeWith(fullSlots);
const blocked = resolveSafariItemCollectorInteraction(full, 0, "exchange:ball:POKEBALL");
assert.equal(blocked.completed, false);
assert.equal(blocked.result, "bag_full");
assert.deepEqual(full.bag.slots, fullSlots,
  "canonical pre-remove capacity failure must not consume the offered item");
assert.equal(full.variables.mapless.board_consumed[0], false);

const left = runtimeWith();
const leave = resolveSafariItemCollectorInteraction(left, 0, "leave");
assert.equal(leave.completed, true);
assert.equal(leave.result, "left");
assert.equal(left.variables.mapless.board_consumed[0], true);
assert.ok(leave.operations.some((operation) => operation.op === "request_save"));

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const adapter = fs.readFileSync(path.join(root, "runtime", "safari-item-collector-interaction.js"), "utf8");
const touch = fs.readFileSync(path.join(root, "item-collector-touch-presentation.js"), "utf8");
const chain = fs.readFileSync(path.join(root, "lost-bag-touch-presentation.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.match(adapter, /resolveCanonicalItemCollectorV108/,
  "Safari must delegate grade pools and event-local RNG to the canonical #858 owner");
assert.doesNotMatch(adapter, /BALL_GRADES|MEDICINE_GRADES|RubyMT19937Random|borrowSafariSharedRunRandomInt/,
  "Safari adapter must not duplicate catalogs or invent/shared-borrow event RNG");
assert.match(adapter, /resolveRewardTransaction/,
  "Safari exchange must reuse the existing atomic Bag transaction owner");
assert.match(touch, /data-normal-event-action/);
assert.match(chain, /item-collector-touch-presentation\.js\?v=20260825-2355/);
assert.match(html, /lost-bag-touch-presentation\.js\?v=20260825-2405/,
  "Safari entry must refresh the post-#858 Item Collector loader chain");

console.log("Safari Item Collector canonical hookup smoke passed");
