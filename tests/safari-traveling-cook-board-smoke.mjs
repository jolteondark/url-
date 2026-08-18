import assert from "node:assert/strict";
import { createSafariPlayableRuntime } from "../runtime/safari-web-startup.js";
import { activateSafariDayBoardCell } from "../runtime/safari-pokemon-center-command.js";
import { resolveSafariTravelingCookInteraction } from "../runtime/safari-traveling-cook-interaction.js";

function runtimeFor(money = 1000) {
  const runtime = createSafariPlayableRuntime();
  const state = runtime.variables.mapless;
  state.board_events[0] = { kind: "normal_event", slot: 0, normal_event_id: "traveling_cook", normal_seed: 12345, normal_resolved: false, normal_data: { prototype_roll: 98 } };
  state.board_revealed[0] = false;
  state.board_visited[0] = false;
  state.board_consumed[0] = false;
  runtime.bag.money = money;
  runtime.player.party[0].hp = 5;
  return runtime;
}

const healed = runtimeFor();
const healResult = resolveSafariTravelingCookInteraction(healed, 0, "pay", "heal");
assert.equal(healResult.result, "paid_heal");
assert.equal(healResult.price, 600);
assert.equal(healed.bag.money, 400);
assert.equal(healed.player.party[0].hp, 19);
assert.equal(healed.variables.mapless.board_consumed[0], true);
assert.equal(healResult.persistenceRequested, true);

const medicine = runtimeFor();
medicine.player.party[0].status = "POISON";
medicine.player.party[0].status_count = 2;
medicine.player.party[0].mapless_overworld_confusion = true;
const medicineResult = resolveSafariTravelingCookInteraction(medicine, 0, "pay", "medicine");
assert.equal(medicineResult.result, "paid_medicine");
assert.equal(medicine.bag.money, 400);
assert.equal(medicine.player.party[0].hp, 5);
assert.equal(medicine.player.party[0].status, "NONE");
assert.equal(medicine.player.party[0].status_count, 0);
assert.equal(medicine.player.party[0].mapless_overworld_confusion, false);
assert.equal(medicine.variables.mapless.board_consumed[0], true);

const poor = runtimeFor(599);
const rejected = resolveSafariTravelingCookInteraction(poor, 0, "pay", "heal");
assert.equal(rejected.result, "payment_failed");
assert.equal(poor.bag.money, 599);
assert.equal(poor.variables.mapless.board_consumed[0], false);
assert.equal(rejected.persistenceRequested, false);

const originalConfirm = globalThis.confirm;
try {
  globalThis.confirm = () => false;
  const left = runtimeFor();
  const result = activateSafariDayBoardCell(left, 0);
  assert.equal(result.boundary, "normal_event");
  assert.equal(result.result, "left");
  assert.equal(left.bag.money, 1000);
  assert.equal(left.variables.mapless.board_consumed[0], true);
} finally {
  if (originalConfirm === undefined) delete globalThis.confirm;
  else globalThis.confirm = originalConfirm;
}

console.log("Safari Traveling Cook paid heal/medicine/payment/leave Board vertical: ok");
