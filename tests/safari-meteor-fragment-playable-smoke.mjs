import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { quantity } from "../runtime/bag-economy-mart-flow.js";
import {
  MAPLESS_V108_METEOR_CARRY_ITEMS,
  MAPLESS_V108_METEOR_STAR_ITEMS,
  MAPLESS_V108_METEOR_STONE_ITEMS,
  hydrateMaplessV108MeteorFragmentFixedData,
} from "../runtime/mapless-v108-meteor-fragment.js";
import { prepareSafariNormalEventV108 } from "../runtime/mapless-normal-event-v108-preparation.js";
import { createSafariPlayableRuntime } from "../runtime/safari-playable-integration.js";
import { openSafariNormalEventTouch, supportsSafariNormalEventTouch } from "../runtime/safari-normal-event-touch-handoff.js";
import { resolveSafariMeteorFragmentInteraction } from "../runtime/safari-meteor-fragment-interaction.js";

function installMeteor(runtime, smashRoll = null) {
  const state = runtime.variables.mapless;
  state.day = 18;
  state.location = "day_board";
  state.board_events = Array.from({ length:8 }, (_, slot) => ({ kind:"center", slot }));
  const normalData = smashRoll == null ? {} : { smash_roll:smashRoll };
  state.board_events[4] = prepareSafariNormalEventV108(
    { kind:"normal_event", slot:4, normal_event_id:"meteor_fragment", normal_data:normalData },
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
function grantedItems(result) {
  return result.operations.filter((operation) => operation.op === "runtime_grant_item");
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
  const event = state.board_events[4];
  const canonical = hydrateMaplessV108MeteorFragmentFixedData(event.normal_seed, {});
  const ready = openSafariNormalEventTouch(runtime, 4);
  const shown = ready.availableActions.filter((action) => action.startsWith("rock:")).map((action) => action.slice(5));
  assert.deepEqual(shown, canonical.rock_choices, "Safari must display the hydrated canonical ROCK choices without a redraw");
  const result = resolveSafariMeteorFragmentInteraction(runtime, 4, `rock:${shown[0]}`);
  assert.equal(result.result, "rock_reward");
  assert.equal(result.completed, true);
  assert.equal(result.persistenceRequested, true);
  assert.equal(state.board_consumed[4], true);
  assert.equal(grantedItems(result).reduce((sum, entry) => sum + Number(entry.quantity ?? 0), 0), 1);
  assert.equal(resolveSafariMeteorFragmentInteraction(runtime, 4, `rock:${shown[0]}`).result, "already_consumed", "resolved Meteor Fragment must be exactly-once");
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
  const granted = grantedItems(result);
  const total = granted.reduce((sum, entry) => sum + Number(entry.quantity ?? 0), 0);
  assert.ok(total >= 2 && total <= 3);
  for (const entry of granted) assert.ok(quantity(runtime.bag.slots, entry.item) >= Number(entry.quantity ?? 1));
}

{
  const runtime = createSafariPlayableRuntime();
  installMeteor(runtime);
  const result = resolveSafariMeteorFragmentInteraction(runtime, 4, "carry");
  assert.equal(result.result, "carry_reward");
  const granted = grantedItems(result);
  assert.equal(granted.length, 1);
  assert.ok(MAPLESS_V108_METEOR_CARRY_ITEMS.includes(granted[0].item));
}

for (const [smashRoll, expectedResult, pool] of [
  [40, "smash_stone", MAPLESS_V108_METEOR_STONE_ITEMS],
  [70, "smash_star", MAPLESS_V108_METEOR_STAR_ITEMS],
]) {
  const runtime = createSafariPlayableRuntime();
  installMeteor(runtime, smashRoll);
  const result = resolveSafariMeteorFragmentInteraction(runtime, 4, "smash");
  assert.equal(result.result, expectedResult);
  const granted = grantedItems(result);
  assert.equal(granted.length, 1);
  assert.ok(pool.includes(granted[0].item));
}

{
  const runtime = createSafariPlayableRuntime();
  const state = installMeteor(runtime, 85);
  const counterBefore = Number(state.preview_encounter_counter ?? 0);
  const result = resolveSafariMeteorFragmentInteraction(runtime, 4, "smash");
  assert.equal(result.result, "smash_large");
  assert.equal(result.completed, true);
  assert.equal(grantedItems(result).length, 1, "SMASH 80..89 must resolve through shared large reward owner");
  assert.ok(Number(state.preview_encounter_counter) > counterBefore, "shared large reward must consume shared run RNG on commit");
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
  const state = installMeteor(runtime, 85);
  runtime.bag.slots = Array.from({ length:20 }, (_, index) => [`FILLER_${index}`, 99]);
  const counterBefore = Number(state.preview_encounter_counter ?? 0);
  const blocked = resolveSafariMeteorFragmentInteraction(runtime, 4, "smash");
  assert.equal(blocked.result, "reward_bag_full");
  assert.equal(Number(state.preview_encounter_counter ?? 0), counterBefore, "failed shared large reward must roll back shared run RNG");
  assert.equal(state.board_consumed[4], false);
}

{
  const runtime = createSafariPlayableRuntime();
  installMeteor(runtime);
  grantType(runtime, "ROCK");
  runtime.player.party[0].hp = 0;
  const ready = openSafariNormalEventTouch(runtime, 4);
  assert.equal(ready.availableActions.some((action) => action.startsWith("rock:")), false, "fainted Rock type must not unlock safe sorting");
}

{
  const source = await readFile(new URL("../runtime/safari-meteor-fragment-interaction.js", import.meta.url), "utf8");
  assert.match(source, /hydrateMaplessV108MeteorFragmentFixedData/);
  assert.match(source, /resolveMaplessV108MeteorFragmentReward/);
  assert.doesNotMatch(source, /LOW_ITEMS|deterministicItems|0x70c4|0x57ee1|0xca771|0x570ae|0x57a2|0x1a29e/);
}

console.log("Safari Meteor Fragment canonical Rock/Steel/smash/carry/leave routes: PASS");
