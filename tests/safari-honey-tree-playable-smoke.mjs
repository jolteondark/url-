import assert from "node:assert/strict";
import { quantity } from "../runtime/bag-economy-mart-flow.js";
import { prepareSafariNormalEventV108 } from "../runtime/mapless-normal-event-v108-preparation.js";
import { createSafariPlayableRuntime } from "../runtime/safari-playable-integration.js";
import { openSafariNormalEventTouch, supportsSafariNormalEventTouch } from "../runtime/safari-normal-event-touch-handoff.js";
import { resolveSafariHoneyTreeInteraction } from "../runtime/safari-honey-tree-interaction.js";
import {
  beginSafariNormalEventBattleContinuation,
  bindSafariNormalEventBattleContinuation,
} from "../runtime/safari-normal-event-battle-continuation.js";
import { returnSafariToDayBoard } from "../runtime/safari-normal-battle-lifecycle.js";

function installHoneyTree(runtime, barkRoll = 20, shakeRoll = 40) {
  const state = runtime.variables.mapless;
  state.day = 18;
  state.location = "day_board";
  state.board_events = Array.from({ length:8 }, (_, slot) => ({ kind:"center", slot }));
  state.board_events[3] = prepareSafariNormalEventV108(
    { kind:"normal_event", slot:3, normal_event_id:"honey_tree", normal_data:{ bark_roll:barkRoll, shake_roll:shakeRoll } },
    { day:18, index:3, partyFull:false },
  );
  state.board_revealed = Array(8).fill(false);
  state.board_consumed = Array(8).fill(false);
  state.board_visited = Array(8).fill(false);
  state.battle = null;
  state.shop = null;
  return state;
}
function grantBug(runtime) {
  assert.ok(runtime.player.party[0], "fixture requires a lead Pokemon");
  runtime.player.party[0].types = ["BUG"];
  runtime.player.party[0].egg = false;
  runtime.player.party[0].hp = Math.max(1, Number(runtime.player.party[0].hp ?? 1));
}

assert.equal(supportsSafariNormalEventTouch("honey_tree"), true);

{
  const runtime = createSafariPlayableRuntime();
  const state = installHoneyTree(runtime);
  const ready = openSafariNormalEventTouch(runtime, 3);
  assert.equal(ready.result, "honey_tree_ready");
  assert.deepEqual(ready.availableActions, ["bark", "shake", "leave"]);
  assert.equal(state.board_consumed[3], false);
}

{
  const runtime = createSafariPlayableRuntime();
  const state = installHoneyTree(runtime);
  grantBug(runtime);
  const ready = openSafariNormalEventTouch(runtime, 3);
  assert.deepEqual(ready.availableActions, ["bug", "bark", "shake", "leave"]);
  const result = resolveSafariHoneyTreeInteraction(runtime, 3, "bug");
  assert.equal(result.result, "bug_safe_reward");
  assert.equal(result.completed, true);
  assert.equal(result.persistenceRequested, true);
  assert.equal(state.board_consumed[3], true);
  assert.equal(quantity(runtime.bag.slots, "HONEY"), 2);
}

{
  const runtime = createSafariPlayableRuntime();
  const state = installHoneyTree(runtime, 20);
  const result = resolveSafariHoneyTreeInteraction(runtime, 3, "bark");
  assert.equal(result.result, "bark_berry");
  assert.equal(result.completed, true);
  assert.equal(state.board_consumed[3], true);
  const granted = result.operations.filter((operation) => operation.op === "runtime_grant_item");
  assert.equal(granted.reduce((sum, entry) => sum + Number(entry.quantity ?? 0), 0), 1);
}

{
  const runtime = createSafariPlayableRuntime();
  const state = installHoneyTree(runtime, 60);
  const result = resolveSafariHoneyTreeInteraction(runtime, 3, "bark");
  assert.equal(result.result, "bark_small");
  assert.equal(result.completed, true);
  assert.equal(state.board_consumed[3], true);
  assert.equal(result.operations.filter((operation) => operation.op === "runtime_grant_item").length, 1);
}

{
  const runtime = createSafariPlayableRuntime();
  const state = installHoneyTree(runtime, 90);
  const result = resolveSafariHoneyTreeInteraction(runtime, 3, "bark");
  assert.equal(result.result, "bark_empty");
  assert.equal(result.completed, true);
  assert.equal(state.board_consumed[3], true);
}

{
  const runtime = createSafariPlayableRuntime();
  const state = installHoneyTree(runtime);
  grantBug(runtime);
  runtime.bag.slots = Array.from({ length:20 }, (_, index) => [`FILLER_${index}`, 99]);
  const before = structuredClone(runtime.bag.slots);
  const blocked = resolveSafariHoneyTreeInteraction(runtime, 3, "bug");
  assert.equal(blocked.result, "reward_bag_full");
  assert.equal(blocked.completed, false);
  assert.equal(blocked.persistenceRequested, false);
  assert.deepEqual(runtime.bag.slots, before);
  assert.equal(state.board_consumed[3], false);
}

{
  const runtime = createSafariPlayableRuntime();
  const state = installHoneyTree(runtime, 20, 95);
  const empty = await resolveSafariHoneyTreeInteraction(runtime, 3, "shake");
  assert.equal(empty.result, "shake_empty");
  assert.equal(empty.completed, true);
  assert.equal(state.board_consumed[3], true);
  assert.equal(state.battle, null);
}

{
  const runtime = createSafariPlayableRuntime();
  const state = installHoneyTree(runtime, 20, 40);
  runtime.bag.slots = Array.from({ length:20 }, (_, index) => [`FILLER_${index}`, 99]);
  const before = structuredClone(runtime.bag.slots);
  const blocked = await resolveSafariHoneyTreeInteraction(runtime, 3, "shake");
  assert.equal(blocked.result, "reward_bag_full");
  assert.equal(blocked.completed, false);
  assert.equal(state.battle, null);
  assert.equal(state.board_consumed[3], false);
  assert.deepEqual(runtime.bag.slots, before);
}

{
  const runtime = createSafariPlayableRuntime();
  const state = installHoneyTree(runtime, 20, 40);
  const beforeHoney = quantity(runtime.bag.slots, "HONEY");
  const checkpoint = beginSafariNormalEventBattleContinuation(runtime, {
    boardIndex:3,
    eventId:"honey_tree",
    actionId:"shake",
    request:{ op:"start_wild_battle", type:"BUG", modifier:1, seed:0 },
    payload:{ shake_roll:40 },
  });
  state.battle = {
    kind:"wild",
    board_index:3,
    turn:2,
    decision:1,
    completed:true,
    captured:false,
    foe:{ species:"CATERPIE" },
    return_target:"day_board",
    last_operations:[],
    presentation:[],
  };
  bindSafariNormalEventBattleContinuation(runtime, checkpoint);
  const returned = returnSafariToDayBoard(runtime);
  assert.equal(returned.normalEventContinuation.result, "shake_guard");
  assert.equal(state.board_consumed[3], true);
  assert.equal(quantity(runtime.bag.slots, "HONEY"), beforeHoney + 1);
  assert.ok(returned.operations.some((operation) => operation.op === "request_save" && operation.reason === "normal_event_post_battle"));
  assert.equal(returned.operations.some((operation) => operation.op === "start_wild_battle"), false, "post-Battle continuation must not restart the encounter");
}

{
  const runtime = createSafariPlayableRuntime();
  installHoneyTree(runtime);
  grantBug(runtime);
  runtime.player.party[0].hp = 0;
  const ready = openSafariNormalEventTouch(runtime, 3);
  assert.equal(ready.availableActions.includes("bug"), false, "fainted Bug type must not unlock safe Honey Tree collection");
}

console.log("Safari Honey Tree Bug/bark/shake/leave routes: PASS");
