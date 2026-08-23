import assert from "node:assert/strict";
import { quantity } from "../runtime/bag-economy-mart-flow.js";
import { prepareSafariNormalEventV108 } from "../runtime/mapless-normal-event-v108-preparation.js";
import { createSafariPlayableRuntime } from "../runtime/safari-playable-integration.js";
import { openSafariNormalEventTouch, supportsSafariNormalEventTouch } from "../runtime/safari-normal-event-touch-handoff.js";
import { resolveSafariMeteorFragmentInteraction } from "../runtime/safari-meteor-fragment-interaction.js";

function installMeteor(runtime, smashRoll = 40) {
  const state = runtime.variables.mapless;
  state.day = 18;
  state.location = "day_board";
  state.board_events = Array.from({ length:8 }, (_, slot) => ({ kind:"center", slot }));
  state.board_events[4] = prepareSafariNormalEventV108(
    { kind:"normal_event", slot:4, normal_event_id:"meteor_fragment", normal_data:{ smash_roll:smashRoll } },
    { day:18, index:4, partyFull:false },
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

assert.equal(supportsSafariNormalEventTouch("meteor_fragment"), true);

{
  const runtime = createSafariPlayableRuntime();
  const state = installMeteor(runtime);
  const ready = openSafariNormalEventTouch(runtime, 4);
  assert.equal(ready.result, "meteor_fragment_ready");
  assert.deepEqual(ready.availableActions, ["smash", "carry", "leave"]);
  assert.equal(state.board_consumed[4], false);
}

{
  const runtime = createSafariPlayableRuntime();
  const state = installMeteor(runtime);
  grantType(runtime, "ROCK");
  const ready = openSafariNormalEventTouch(runtime, 4);
  const rockAction = ready.availableActions.find((action) => action.startsWith("rock:"));
  assert.ok(rockAction, "usable Rock type must expose at least one safe fragment choice");
  const result = resolveSafariMeteorFragmentInteraction(runtime, 4, rockAction);
  assert.equal(result.result, "rock_reward");
  assert.equal(result.completed, true);
  assert.equal(result.persistenceRequested, true);
  assert.equal(state.board_consumed[4], true);
  const granted = result.operations.filter((operation) => operation.op === "runtime_grant_item");
  assert.equal(granted.reduce((sum, entry) => sum + Number(entry.quantity ?? 0), 0), 1);
}

{
  const runtime = createSafariPlayableRuntime();
  const state = installMeteor(runtime);
  grantType(runtime, "STEEL");
  const ready = openSafariNormalEventTouch(runtime, 4);
  assert.ok(ready.availableActions.includes("steel"));
  const result = resolveSafariMeteorFragmentInteraction(runtime, 4, "steel");
  assert.equal(result.result, "steel_reward");
  assert.equal(state.board_consumed[4], true);
  const granted = result.operations.filter((operation) => operation.op === "runtime_grant_item");
  const total = granted.reduce((sum, entry) => sum + Number(entry.quantity ?? 0), 0);
  assert.ok(total >= 2 && total <= 3);
  for (const entry of granted) assert.ok(quantity(runtime.bag.slots, entry.item) >= Number(entry.quantity ?? 1));
}

{
  const runtime = createSafariPlayableRuntime();
  const state = installMeteor(runtime, 95);
  const before = runtime.player.party.map((pokemon) => Number(pokemon?.hp ?? 0));
  const result = resolveSafariMeteorFragmentInteraction(runtime, 4, "smash");
  assert.equal(result.result, "smash_blast");
  assert.equal(result.completed, true);
  assert.equal(state.board_consumed[4], true);
  assert.ok(result.operations.some((operation) => operation.op === "runtime_damage_party" && operation.percent === 15));
  runtime.player.party.forEach((pokemon, index) => {
    if (before[index] > 0 && pokemon?.egg !== true) assert.ok(Number(pokemon.hp) >= 1 && Number(pokemon.hp) < before[index]);
  });
}

{
  const runtime = createSafariPlayableRuntime();
  const state = installMeteor(runtime);
  runtime.bag.slots = Array.from({ length:20 }, (_, index) => [`FILLER_${index}`, 99]);
  const before = structuredClone(runtime.bag.slots);
  const blocked = resolveSafariMeteorFragmentInteraction(runtime, 4, "carry");
  assert.equal(blocked.result, "reward_bag_full");
  assert.equal(blocked.completed, false);
  assert.equal(blocked.persistenceRequested, false);
  assert.deepEqual(runtime.bag.slots, before);
  assert.equal(state.board_consumed[4], false, "full Bag must leave Meteor Fragment unresolved");
}

{
  const runtime = createSafariPlayableRuntime();
  installMeteor(runtime);
  grantType(runtime, "ROCK");
  runtime.player.party[0].hp = 0;
  const ready = openSafariNormalEventTouch(runtime, 4);
  assert.equal(ready.availableActions.some((action) => action.startsWith("rock:")), false, "fainted Rock type must not unlock safe sorting");
}

console.log("Safari Meteor Fragment Rock/Steel/smash/carry/leave routes: PASS");
