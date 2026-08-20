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

console.log("Safari flooded river canonical force/leave interaction: PASS");
