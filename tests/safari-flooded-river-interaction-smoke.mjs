import assert from "node:assert/strict";
import { prepareSafariNormalEventV108 } from "../runtime/mapless-normal-event-v108-preparation.js";
import { quantity } from "../runtime/bag-economy-mart-flow.js";
import {
  interactiveSafariFloodedRiver,
  resolveSafariFloodedRiverInteraction,
} from "../runtime/safari-flooded-river-interaction.js";
import { createSafariPlayableRuntime } from "../runtime/safari-playable-integration.js";

function installDay14River(runtime) {
  const state = runtime.variables.mapless;
  state.day = 14;
  state.location = "day_board";
  state.board_events = Array.from({ length: 8 }, (_, slot) => ({ kind: "center", slot }));
  state.board_events[2] = prepareSafariNormalEventV108(
    { kind: "normal_event", slot: 2, normal_data: {} },
    { day: 14, index: 2, partyFull: false },
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

{
  const runtime = createSafariPlayableRuntime();
  const state = installDay14River(runtime);
  assert.equal(state.board_events[2].normal_event_id, "flooded_river",
    "DAY 14 canonical normal-event seed must resolve to flooded_river");
  runtime.bag.slots = [["POTION", 1]];
  const before = runtime.player.party.map((pokemon) => ({ hp: Number(pokemon.hp), maxHp: Number(pokemon.max_hp) }));

  const result = resolveSafariFloodedRiverInteraction(runtime, 2, "force");
  assert.equal(result.completed, true);
  assert.equal(result.result, "force_major_damage_item_lost");
  assert.equal(state.board_events[2].normal_data.force_roll, 98,
    "canonical Ruby Random.new(normal_seed).rand(100) must be persisted for replay stability");
  assert.equal(state.board_consumed[2], true);
  assert.equal(state.board_visited[2], true);
  assert.equal(quantity(runtime.bag.slots, "POTION"), 0,
    "roll >= 90 must remove one owned canonical LOW_ITEM through the Bag owner");
  runtime.player.party.forEach((pokemon, index) => {
    const damage = Math.max(1, Math.ceil(before[index].maxHp * 20 / 100));
    assert.equal(Number(pokemon.hp), Math.max(1, before[index].hp - damage),
      "flooded river force damage must be canonical 20% max HP with a minimum of 1 HP remaining");
  });
  assert.equal(result.operations.some((operation) => operation.op === "runtime_damage_party" && operation.percent === 20), true);
  assert.equal(result.operations.some((operation) => operation.op === "runtime_remove_item" && operation.item === "POTION"), true);
}

{
  const runtime = createSafariPlayableRuntime();
  const state = installDay14River(runtime);
  const hpBefore = runtime.player.party.map((pokemon) => Number(pokemon.hp));
  runtime.bag.slots = [["POTION", 1]];
  const left = resolveSafariFloodedRiverInteraction(runtime, 2, "leave");
  assert.equal(left.result, "left");
  assert.equal(left.completed, true);
  assert.deepEqual(runtime.player.party.map((pokemon) => Number(pokemon.hp)), hpBefore,
    "canonical leave path must not damage the Party");
  assert.equal(quantity(runtime.bag.slots, "POTION"), 1,
    "canonical leave path must not remove Bag items");
  assert.equal(state.board_consumed[2], true);
}

{
  const runtime = createSafariPlayableRuntime();
  const state = installDay14River(runtime);
  const ready = interactiveSafariFloodedRiver(runtime, 2);
  assert.equal(ready.result, "flooded_river_ready");
  assert.deepEqual(ready.availableActions, ["force", "leave"]);
  assert.equal(state.board_revealed[2], true);
  assert.equal(state.board_consumed[2], false,
    "opening the Safari river presentation without a decision must not consume the Board cell");
}

{
  const runtime = createSafariPlayableRuntime();
  const state = installDay14River(runtime);
  grantType(runtime, "WATER");
  const ready = interactiveSafariFloodedRiver(runtime, 2);
  assert.deepEqual(ready.availableActions, ["water", "force", "leave"],
    "a living Water-type Party member must expose the safe Water route");

  const crossed = resolveSafariFloodedRiverInteraction(runtime, 2, "water");
  assert.equal(crossed.result, "water_crossing");
  assert.equal(crossed.completed, true);
  assert.equal(crossed.persistenceRequested, true);
  assert.equal(state.board_consumed[2], true);
  const granted = crossed.operations.filter((operation) => operation.op === "runtime_grant_item");
  assert.ok(granted.length >= 1 && granted.length <= 2,
    "Water crossing must atomically grant the canonical 1-2 item reward");
  for (const entry of granted) {
    assert.ok(quantity(runtime.bag.slots, entry.item) >= Number(entry.quantity ?? 1),
      `Water reward ${entry.item} must be committed to the Safari Bag`);
  }
}

{
  const runtime = createSafariPlayableRuntime();
  const state = installDay14River(runtime);
  grantType(runtime, "ICE");
  const ready = interactiveSafariFloodedRiver(runtime, 2);
  assert.deepEqual(ready.availableActions, ["ice", "force", "leave"],
    "a living Ice-type Party member must expose the safe Ice route");

  const crossed = resolveSafariFloodedRiverInteraction(runtime, 2, "ice");
  assert.equal(crossed.result, "ice_crossing");
  assert.equal(crossed.completed, true);
  assert.equal(crossed.persistenceRequested, true);
  assert.equal(state.board_consumed[2], true);
  const granted = crossed.operations.filter((operation) => operation.op === "runtime_grant_item");
  assert.equal(granted.length, 1, "Ice crossing must grant exactly one reward item");
  assert.ok(quantity(runtime.bag.slots, granted[0].item) >= Number(granted[0].quantity ?? 1));
}

{
  const runtime = createSafariPlayableRuntime();
  const state = installDay14River(runtime);
  grantType(runtime, "WATER");
  runtime.bag.slots = Array.from({ length: 20 }, (_, index) => [`FILLER_${index}`, 99]);
  const before = structuredClone(runtime.bag.slots);

  const blocked = resolveSafariFloodedRiverInteraction(runtime, 2, "water");
  assert.equal(blocked.result, "reward_bag_full");
  assert.equal(blocked.completed, false);
  assert.equal(blocked.persistenceRequested, false);
  assert.deepEqual(runtime.bag.slots, before,
    "a multi-item River reward must not partially mutate a full Safari Bag");
  assert.equal(state.board_consumed[2], false,
    "the River cell must remain available when the complete reward cannot be received");
}

{
  const runtime = createSafariPlayableRuntime();
  const state = installDay14River(runtime);
  grantType(runtime, "WATER");
  runtime.player.party[0].hp = 0;
  const ready = interactiveSafariFloodedRiver(runtime, 2);
  assert.deepEqual(ready.availableActions, ["force", "leave"],
    "a fainted Water-type must not unlock the safe River route");
  assert.equal(state.board_consumed[2], false);
}

console.log("Safari flooded river force/leave + Water/Ice special routes: PASS");
