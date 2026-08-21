import assert from "node:assert/strict";
import {
  advanceSafariEggHatchVisitsV108,
  captureSafariFirstVisitCandidateV108,
  hatchReadySafariEggsV108,
} from "../runtime/safari-egg-hatch-visits-v108.js";

function runtimeWithEgg(steps = 20) {
  return {
    variables: { mapless: { board_visited: Array(8).fill(false), battle: null, last_operations: [] } },
    player: { party: [{ species: "BULBASAUR", steps_to_hatch: steps, mapless_hatch_system_version: 918, mapless_egg_shop_bonus_pending: true }] },
    bag: { money: 0, slots: [] },
    storage_system: { boxes: [] },
  };
}

{
  const runtime = runtimeWithEgg();
  const candidate = captureSafariFirstVisitCandidateV108(runtime, 2);
  const beforeCommit = advanceSafariEggHatchVisitsV108(runtime, candidate);
  assert.equal(beforeCommit.advanced, false);
  assert.equal(runtime.player.party[0].steps_to_hatch, 20);
  runtime.variables.mapless.board_visited[2] = true;
  const committed = advanceSafariEggHatchVisitsV108(runtime, candidate);
  assert.equal(committed.advanced, true);
  assert.equal(runtime.player.party[0].steps_to_hatch, 19);
}

{
  const runtime = runtimeWithEgg(7);
  runtime.variables.mapless.board_visited[4] = true;
  const candidate = captureSafariFirstVisitCandidateV108(runtime, 4);
  const result = advanceSafariEggHatchVisitsV108(runtime, candidate);
  assert.equal(result.advanced, false);
  assert.equal(runtime.player.party[0].steps_to_hatch, 7);
}

{
  const runtime = runtimeWithEgg(1);
  const candidate = captureSafariFirstVisitCandidateV108(runtime, 0);
  runtime.variables.mapless.board_visited[0] = true;
  runtime.variables.mapless.battle = { kind: "wild" };
  advanceSafariEggHatchVisitsV108(runtime, candidate);
  assert.equal(runtime.player.party[0].steps_to_hatch, 0);
  const deferred = hatchReadySafariEggsV108(runtime);
  assert.equal(deferred.deferred, true);
  assert.equal(runtime.player.party[0].mapless_hatch_system_version, 918);
  runtime.variables.mapless.battle = null;
  const hatched = hatchReadySafariEggsV108(runtime);
  assert.equal(hatched.hatched.length, 1);
  assert.equal(runtime.player.party[0].mapless_hatch_system_version, undefined);
  assert.equal(runtime.player.party[0].mapless_hatched_from_visits, true);
  assert.equal(runtime.player.party[0].mapless_egg_shop_bonus_pending, true);
  assert.equal(runtime.variables.mapless.last_operations.at(-1).op, "request_save");
}

{
  const runtime = runtimeWithEgg(3);
  runtime.player.party.push({ species: "CHARMANDER", steps_to_hatch: 9, mapless_hatch_system_version: 918 });
  runtime.player.party.push({ species: "SQUIRTLE", steps_to_hatch: 0 });
  const candidate = captureSafariFirstVisitCandidateV108(runtime, 7);
  runtime.variables.mapless.board_visited[7] = true;
  const result = advanceSafariEggHatchVisitsV108(runtime, candidate);
  assert.deepEqual(result.eggs.map((entry) => entry.after), [2, 8]);
  assert.equal(runtime.player.party[2].steps_to_hatch, 0);
}

console.log("safari egg hatch visit lifecycle smoke: ok");
