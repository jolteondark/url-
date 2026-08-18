import assert from "node:assert/strict";
import { createSafariPlayableRuntime } from "../runtime/safari-web-startup.js";
import { activateSafariDayBoardCell } from "../runtime/safari-pokemon-center-command.js";
import { resolveSafariFakeNurseInteraction } from "../runtime/safari-fake-nurse-interaction.js";
import { prepareSafariNormalEventV108 } from "../runtime/mapless-normal-event-v108-preparation.js";

function runtimeFor(seed, money = 1000) {
  const runtime = createSafariPlayableRuntime();
  const state = runtime.variables.mapless;
  state.board_events[0] = prepareSafariNormalEventV108({
    kind: "normal_event",
    slot: 0,
    normal_event_id: "fake_nurse",
    normal_seed: seed,
    normal_resolved: false,
    normal_data: {},
  }, { day: 1, index: 0, partyFull: false });
  state.board_revealed[0] = false;
  state.board_visited[0] = false;
  state.board_consumed[0] = false;
  runtime.bag.money = money;
  runtime.player.party[0].hp = 5;
  runtime.player.party[0].status = "POISON";
  runtime.player.party[0].moves[0].pp = 1;
  return runtime;
}

const real = runtimeFor(0);
assert.equal(real.variables.mapless.board_events[0].normal_data.fake, false);
const healed = resolveSafariFakeNurseInteraction(real, 0, "pay");
assert.equal(healed.result, "real_paid_heal");
assert.equal(healed.price, 500);
assert.equal(real.bag.money, 500);
assert.equal(real.player.party[0].hp, 28);
assert.equal(real.player.party[0].status, "NONE");
assert.equal(real.player.party[0].moves[0].pp, 35);
assert.equal(real.variables.mapless.board_consumed[0], true);
assert.equal(healed.persistenceRequested, true);

const fake = runtimeFor(5);
assert.equal(fake.variables.mapless.board_events[0].normal_data.fake, true);
assert.equal(fake.variables.mapless.board_events[0].normal_data.id_roll, 78);
const trapped = resolveSafariFakeNurseInteraction(fake, 0, "pay");
assert.equal(trapped.result, "fake_paid_trap");
assert.equal(trapped.randomStatus, "SLEEP");
assert.equal(fake.bag.money, 500);
assert.equal(fake.player.party[0].hp, 5);
assert.equal(fake.player.party[0].status, "SLEEP");
assert.equal(fake.variables.mapless.board_consumed[0], true);

const poor = runtimeFor(0, 499);
const rejected = resolveSafariFakeNurseInteraction(poor, 0, "pay");
assert.equal(rejected.result, "payment_failed");
assert.equal(poor.bag.money, 499);
assert.equal(poor.variables.mapless.board_consumed[0], false);
assert.equal(rejected.persistenceRequested, false);

const originalConfirm = globalThis.confirm;
try {
  globalThis.confirm = () => false;
  const left = runtimeFor(0);
  const result = activateSafariDayBoardCell(left, 0);
  assert.equal(result.boundary, "normal_event");
  assert.equal(result.result, "left");
  assert.equal(left.bag.money, 1000);
  assert.equal(left.variables.mapless.board_consumed[0], true);
} finally {
  if (originalConfirm === undefined) delete globalThis.confirm;
  else globalThis.confirm = originalConfirm;
}

console.log("Safari Fake Nurse canonical real/fake/payment/leave Board vertical: ok");
