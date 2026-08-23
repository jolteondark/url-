import assert from "node:assert/strict";
import { quantity } from "../runtime/bag-economy-mart-flow.js";
import { prepareSafariNormalEventV108 } from "../runtime/mapless-normal-event-v108-preparation.js";
import { createSafariPlayableRuntime } from "../runtime/safari-playable-integration.js";
import { openSafariNormalEventTouch, supportsSafariNormalEventTouch } from "../runtime/safari-normal-event-touch-handoff.js";
import { resolveSafariBurningWagonInteraction } from "../runtime/safari-burning-wagon-interaction.js";

function installWagon(runtime, { manualRoll = 70 } = {}) {
  const state = runtime.variables.mapless;
  state.day = 14;
  state.location = "day_board";
  state.board_events = Array.from({ length:8 }, (_, slot) => ({ kind:"center", slot }));
  state.board_events[3] = prepareSafariNormalEventV108(
    { kind:"normal_event", slot:3, normal_event_id:"burning_wagon", normal_data:{ manual_roll:manualRoll } },
    { day:14, index:3, partyFull:false },
  );
  state.board_revealed = Array(8).fill(false);
  state.board_consumed = Array(8).fill(false);
  state.board_visited = Array(8).fill(false);
  state.battle = null;
  state.shop = null;
  return state;
}
function grantType(runtime, typeId) {
  assert.ok(runtime.player.party[0], "fixture requires a lead Pokemon");
  runtime.player.party[0].types = [typeId];
  runtime.player.party[0].egg = false;
  runtime.player.party[0].hp = Math.max(1, Number(runtime.player.party[0].hp ?? 1));
}

assert.equal(supportsSafariNormalEventTouch("burning_wagon"), true);

{
  const runtime = createSafariPlayableRuntime();
  const state = installWagon(runtime);
  const ready = openSafariNormalEventTouch(runtime, 3);
  assert.equal(ready.result, "burning_wagon_ready");
  assert.deepEqual(ready.availableActions, ["manual", "leave"]);
  assert.equal(state.board_consumed[3], false, "opening Burning Wagon must not consume the cell");
}

{
  const runtime = createSafariPlayableRuntime();
  const state = installWagon(runtime);
  grantType(runtime, "WATER");
  const ready = openSafariNormalEventTouch(runtime, 3);
  assert.deepEqual(ready.availableActions, ["water", "manual", "leave"]);
  const result = resolveSafariBurningWagonInteraction(runtime, 3, "water");
  assert.equal(result.result, "water_rescue");
  assert.equal(result.completed, true);
  assert.equal(result.persistenceRequested, true);
  assert.equal(state.board_consumed[3], true);
  const granted = result.operations.filter((operation) => operation.op === "runtime_grant_item");
  const grantedQuantity = granted.reduce((sum, entry) => sum + Number(entry.quantity ?? 0), 0);
  assert.ok(grantedQuantity >= 2 && grantedQuantity <= 3, "Water rescue must atomically grant 2-3 total items");
  for (const entry of granted) assert.ok(quantity(runtime.bag.slots, entry.item) >= Number(entry.quantity ?? 1));
}

{
  const runtime = createSafariPlayableRuntime();
  const state = installWagon(runtime);
  grantType(runtime, "FIRE");
  const ready = openSafariNormalEventTouch(runtime, 3);
  assert.deepEqual(ready.availableActions, ["fire", "manual", "leave"]);
  const result = resolveSafariBurningWagonInteraction(runtime, 3, "fire");
  assert.equal(result.result, "fire_rescue_reward");
  assert.equal(result.completed, true);
  assert.equal(state.board_consumed[3], true);
  const granted = result.operations.filter((operation) => operation.op === "runtime_grant_item");
  assert.equal(granted.reduce((sum, entry) => sum + Number(entry.quantity ?? 0), 0), 1, "Fire rescue must grant exactly one item");
}

{
  const runtime = createSafariPlayableRuntime();
  const state = installWagon(runtime, { manualRoll:70 });
  const hpBefore = Number(runtime.player.party[0].hp);
  const result = resolveSafariBurningWagonInteraction(runtime, 3, "manual");
  assert.equal(result.result, "manual_rescue_reward");
  assert.equal(Number(runtime.player.party[0].hp), hpBefore);
  assert.equal(result.operations.filter((operation) => operation.op === "runtime_grant_item").reduce((sum, entry) => sum + Number(entry.quantity ?? 0), 0), 1);
  assert.equal(state.board_consumed[3], true);
}

{
  const runtime = createSafariPlayableRuntime();
  const state = installWagon(runtime);
  grantType(runtime, "WATER");
  runtime.bag.slots = Array.from({ length:20 }, (_, index) => [`FILLER_${index}`, 99]);
  const before = structuredClone(runtime.bag.slots);
  const blocked = resolveSafariBurningWagonInteraction(runtime, 3, "water");
  assert.equal(blocked.result, "reward_bag_full");
  assert.equal(blocked.completed, false);
  assert.equal(blocked.persistenceRequested, false);
  assert.deepEqual(runtime.bag.slots, before);
  assert.equal(state.board_consumed[3], false, "full Bag must leave Burning Wagon unresolved");
}

{
  const runtime = createSafariPlayableRuntime();
  const state = installWagon(runtime, { manualRoll:10 });
  const before = Number(runtime.player.party[0].hp);
  const result = resolveSafariBurningWagonInteraction(runtime, 3, "manual");
  assert.equal(result.result, "manual_rescue_injured");
  assert.equal(Number(runtime.player.party[0].hp), Math.max(0, before - 20));
  assert.equal(state.board_consumed[3], true);
}

{
  const runtime = createSafariPlayableRuntime();
  installWagon(runtime);
  grantType(runtime, "WATER");
  runtime.player.party[0].hp = 0;
  const ready = openSafariNormalEventTouch(runtime, 3);
  assert.deepEqual(ready.availableActions, ["manual", "leave"], "fainted Water-type must not unlock Water rescue");
}

console.log("Safari Burning Wagon Water/Fire/manual/leave routes: PASS");
