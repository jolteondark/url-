import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSafariWishingFountainInteraction, safariWishingFountainPresentation } from "../runtime/safari-wishing-fountain-interaction.js";

function runtimeWith({ money=1000, smallRoll=10, slots=[] }={}) {
  return {
    bag:{ money, slots:structuredClone(slots) },
    player:{ party:[{ species:"EEVEE", hp:10, totalhp:20, status:null }] },
    variables:{ mapless:{
      day:1, location:"day_board", preview_encounter_seed:1234, preview_encounter_counter:0,
      board_events:[{ kind:"normal_event", normal_event_id:"wishing_fountain", normal_seed:7, normal_data:{ small_roll:smallRoll, large_roll:0, reach_roll:0, bonus_stat:"ATTACK" } }],
      board_revealed:[false], board_visited:[false], board_consumed:[false], last_operations:[], notice:"",
    } },
  };
}

const presentation = safariWishingFountainPresentation(runtimeWith(), 0);
assert.deepEqual(presentation.actions.map((action) => action.id), ["small_wish", "large_wish", "reach", "leave"]);

const healed = runtimeWith({ money:500, smallRoll:10 });
const healResult = resolveSafariWishingFountainInteraction(healed, 0, "small_wish");
assert.equal(healResult.completed, true);
assert.equal(healResult.result, "small_heal");
assert.equal(healed.bag.money, 300);
assert.equal(healed.variables.mapless.board_consumed[0], true);
assert.ok(healResult.operations.some((operation) => operation.op === "runtime_heal_party_percent"));
assert.ok(healResult.operations.some((operation) => operation.op === "request_save"));

const poor = runtimeWith({ money:199, smallRoll:10 });
const poorResult = resolveSafariWishingFountainInteraction(poor, 0, "small_wish");
assert.equal(poorResult.completed, false);
assert.equal(poor.bag.money, 199);
assert.equal(poor.variables.mapless.board_consumed[0], false);

const fullSlots = Array.from({ length:20 }, (_, i) => [`FILLER${i}`, 99]);
const blockedReward = runtimeWith({ money:500, smallRoll:60, slots:fullSlots });
const counterBefore = blockedReward.variables.mapless.preview_encounter_counter;
const rewardResult = resolveSafariWishingFountainInteraction(blockedReward, 0, "small_wish");
assert.equal(rewardResult.completed, false);
assert.equal(rewardResult.result, "reward_bag_full");
assert.equal(blockedReward.bag.money, 500);
assert.equal(blockedReward.variables.mapless.board_consumed[0], false);
assert.equal(blockedReward.variables.mapless.preview_encounter_counter, counterBefore,
  "failed reward capacity must not drift shared run RNG");

for (const action of ["large_wish", "reach"]) {
  const pending = runtimeWith({ money:9999, smallRoll:10 });
  const result = resolveSafariWishingFountainInteraction(pending, 0, action);
  assert.equal(result.completed, false);
  assert.equal(result.result, "shared_large_reward_pending");
  assert.equal(pending.variables.mapless.board_consumed[0], false);
  assert.equal(pending.bag.money, 9999);
}

const left = runtimeWith();
const leaveResult = resolveSafariWishingFountainInteraction(left, 0, "leave");
assert.equal(leaveResult.completed, true);
assert.equal(leaveResult.result, "left");
assert.equal(left.variables.mapless.board_consumed[0], true);

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const touch = fs.readFileSync(path.join(root, "wishing-fountain-touch-presentation.js"), "utf8");
const chain = fs.readFileSync(path.join(root, "lost-bag-touch-presentation.js"), "utf8");
assert.match(touch, /data-normal-event-action/);
assert.match(chain, /wishing-fountain-touch-presentation\.js\?v=20260826-0030/);

console.log("Safari Wishing Fountain safe playable hookup smoke passed");
