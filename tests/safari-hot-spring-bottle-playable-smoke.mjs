import assert from "node:assert/strict";
import { quantity } from "../runtime/bag-economy-mart-flow.js";
import { prepareSafariNormalEventV108 } from "../runtime/mapless-normal-event-v108-preparation.js";
import { createSafariPlayableRuntime } from "../runtime/safari-playable-integration.js";
import { openSafariNormalEventTouch } from "../runtime/safari-normal-event-touch-handoff.js";
import { resolveSafariHotSpringInteraction } from "../runtime/safari-hot-spring-interaction.js";

function installHotSpring(runtime) {
  const state = runtime.variables.mapless;
  state.day = 9;
  state.location = "day_board";
  state.board_events = Array.from({ length:8 }, (_, slot) => ({ kind:"center", slot }));
  state.board_events[2] = prepareSafariNormalEventV108(
    { kind:"normal_event", slot:2, normal_event_id:"hot_spring", normal_data:{} },
    { day:9, index:2, partyFull:false },
  );
  state.board_revealed = Array(8).fill(false);
  state.board_consumed = Array(8).fill(false);
  state.board_visited = Array(8).fill(false);
  state.battle = null;
  state.shop = null;
  return state;
}

{
  const runtime = createSafariPlayableRuntime();
  const state = installHotSpring(runtime);
  const ready = openSafariNormalEventTouch(runtime, 2);
  assert.ok(ready.availableActions.includes("bottle"), "Hot Spring UI must expose canonical bottle route");
  assert.equal(state.board_consumed[2], false);

  const result = resolveSafariHotSpringInteraction(runtime, 2, "bottle");
  assert.equal(result.result, "bottled_water");
  assert.equal(result.completed, true);
  assert.equal(result.persistenceRequested, true);
  assert.equal(state.board_consumed[2], true);
  const granted = result.operations.filter((operation) => operation.op === "runtime_grant_item");
  const total = granted.reduce((sum, entry) => sum + Number(entry.quantity ?? 0), 0);
  assert.ok(total >= 1 && total <= 2, "bottle route must atomically grant 1-2 items");
  for (const entry of granted) assert.ok(quantity(runtime.bag.slots, entry.item) >= Number(entry.quantity ?? 1));
}

{
  const runtime = createSafariPlayableRuntime();
  const state = installHotSpring(runtime);
  runtime.bag.slots = Array.from({ length:20 }, (_, index) => [`FILLER_${index}`, 99]);
  const before = structuredClone(runtime.bag.slots);
  const blocked = resolveSafariHotSpringInteraction(runtime, 2, "bottle");
  assert.equal(blocked.result, "reward_bag_full");
  assert.equal(blocked.completed, false);
  assert.equal(blocked.persistenceRequested, false);
  assert.deepEqual(runtime.bag.slots, before);
  assert.equal(state.board_consumed[2], false, "full Bag must leave Hot Spring unresolved");
}

{
  const runtime = createSafariPlayableRuntime();
  const state = installHotSpring(runtime);
  const result = resolveSafariHotSpringInteraction(runtime, 2, "leave");
  assert.equal(result.result, "left");
  assert.equal(state.board_consumed[2], true);
}

console.log("Safari Hot Spring bottle/Bag rollback/leave routes: PASS");
