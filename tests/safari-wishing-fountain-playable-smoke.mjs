import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSafariWishingFountainInteraction, safariWishingFountainPresentation } from "../runtime/safari-wishing-fountain-interaction.js";

function runtimeWith({ money=1000, smallRoll=10, largeRoll=0, reachRoll=0, day=1, slots=[] }={}) {
  return {
    bag:{ money, slots:structuredClone(slots) },
    player:{ party:[{ species:"EEVEE", hp:10, totalhp:20, status:null }] },
    variables:{ mapless:{
      day, location:"day_board", preview_encounter_seed:1234, preview_encounter_counter:0,
      board_events:[{ kind:"normal_event", normal_event_id:"wishing_fountain", normal_seed:7, normal_data:{ small_roll:smallRoll, large_roll:largeRoll, reach_roll:reachRoll, bonus_stat:"ATTACK" } }],
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
  "failed small reward capacity must not drift shared run RNG");

const large = runtimeWith({ money:2000, largeRoll:0 });
const largeCounterBefore = large.variables.mapless.preview_encounter_counter;
const largeResult = resolveSafariWishingFountainInteraction(large, 0, "large_wish");
assert.equal(largeResult.completed, true);
assert.equal(largeResult.result, "large_reward");
assert.equal(large.bag.money, 800, "Day 1 large wish must cost canonical 1200 yen");
assert.equal(large.variables.mapless.preview_encounter_counter, largeCounterBefore + 1,
  "large reward must consume one shared run RNG draw");
assert.equal(large.variables.mapless.board_consumed[0], true);
assert.ok(largeResult.operations.some((operation) => operation.op === "select_normal_event_random_item" && operation.size === "large"));
assert.ok(largeResult.operations.some((operation) => operation.op === "runtime_grant_item"));

const largeOld = runtimeWith({ money:2000, largeRoll:90 });
const oldResult = resolveSafariWishingFountainInteraction(largeOld, 0, "large_wish");
assert.equal(oldResult.completed, true);
assert.equal(oldResult.result, "large_old_offering");
assert.ok(oldResult.reward?.selectedItems?.length === 1);

const largeNothing = runtimeWith({ money:2000, largeRoll:99 });
const nothingResult = resolveSafariWishingFountainInteraction(largeNothing, 0, "large_wish");
assert.equal(nothingResult.completed, true);
assert.equal(nothingResult.result, "large_nothing");
assert.equal(largeNothing.bag.money, 800);
assert.equal(largeNothing.variables.mapless.preview_encounter_counter, 0,
  "large nothing must not consume shared reward RNG");

for (const [largeRoll, expected] of [[50, "pokemon_bonus_owner_pending"], [70, "full_heal_owner_pending"]]) {
  const pending = runtimeWith({ money:9999, largeRoll });
  const result = resolveSafariWishingFountainInteraction(pending, 0, "large_wish");
  assert.equal(result.completed, false);
  assert.equal(result.result, expected);
  assert.equal(pending.variables.mapless.board_consumed[0], false);
  assert.equal(pending.bag.money, 9999, "blocked large-wish outcomes must not spend money");
}

const reachMoney = runtimeWith({ money:100, reachRoll:10, day:11 });
const reachMoneyResult = resolveSafariWishingFountainInteraction(reachMoney, 0, "reach");
assert.equal(reachMoneyResult.completed, true);
assert.equal(reachMoneyResult.result, "reach_money");
assert.equal(reachMoney.bag.money, 900, "Day 11 scaling=2 reach money must add 800 yen");

const reachReward = runtimeWith({ money:100, reachRoll:95 });
const reachRewardResult = resolveSafariWishingFountainInteraction(reachReward, 0, "reach");
assert.equal(reachRewardResult.completed, true);
assert.equal(reachRewardResult.result, "reach_large_reward");
assert.ok(reachRewardResult.reward?.selectedItems?.length === 1);
assert.equal(reachReward.variables.mapless.board_consumed[0], true);

for (const [reachRoll, expected] of [[50, "reach_battle_owner_pending"], [80, "reach_status_owner_pending"]]) {
  const pending = runtimeWith({ money:9999, reachRoll });
  const result = resolveSafariWishingFountainInteraction(pending, 0, "reach");
  assert.equal(result.completed, false);
  assert.equal(result.result, expected);
  assert.equal(pending.variables.mapless.board_consumed[0], false);
}

const blockedLargeReward = runtimeWith({ money:2000, largeRoll:0, slots:fullSlots });
const blockedLargeCounter = blockedLargeReward.variables.mapless.preview_encounter_counter;
const blockedLarge = resolveSafariWishingFountainInteraction(blockedLargeReward, 0, "large_wish");
assert.equal(blockedLarge.completed, false);
assert.equal(blockedLarge.result, "reward_bag_full");
assert.equal(blockedLargeReward.bag.money, 2000);
assert.equal(blockedLargeReward.variables.mapless.preview_encounter_counter, blockedLargeCounter,
  "failed large reward capacity must roll back the shared run RNG draw");

const left = runtimeWith();
const leaveResult = resolveSafariWishingFountainInteraction(left, 0, "leave");
assert.equal(leaveResult.completed, true);
assert.equal(leaveResult.result, "left");
assert.equal(left.variables.mapless.board_consumed[0], true);

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const touch = fs.readFileSync(path.join(root, "wishing-fountain-touch-presentation.js"), "utf8");
const chain = fs.readFileSync(path.join(root, "lost-bag-touch-presentation.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.match(touch, /safari-wishing-fountain-interaction\.js\?v=20260826-0130/);
assert.match(touch, /data-normal-event-action/);
assert.match(chain, /wishing-fountain-touch-presentation\.js\?v=20260826-0130/);
assert.match(html, /lost-bag-touch-presentation\.js\?v=20260826-0130/);

console.log("Safari Wishing Fountain safe large/reach reward hookup smoke passed");
