import assert from "node:assert/strict";

const events = [];
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = {
  dispatchEvent(event) {
    events.push(event.type);
    return true;
  },
};

const web = await import("../runtime/safari-web-playable-integration.js");
const runtime = web.createSafariPlayableRuntime();
const state = runtime.variables.mapless;

state.mapless_run_active = true;
state.mapless_run_prepared = true;
state.mapless_run_end_pending = true;
state.mapless_carryover_pending = false;
state.location = "battle";
runtime.player.party[0].hp = 0;
state.battle = {
  completed: true,
  decision: 2,
  captured: false,
  exp_gained: 0,
  trainer_exp_gained: 0,
  reward: null,
  money_gained: 0,
  return_target: "home",
  origin: "day_board",
  kind: "wild",
};

const before = events.filter((type) => type === "safari-runtime-changed").length;
const returned = await web.returnSafariToDayBoard(runtime);
const after = events.filter((type) => type === "safari-runtime-changed").length;

assert.equal(returned.target, "home");
assert.equal(state.location, "home");
assert.equal(state.mapless_carryover_pending, true);
assert.equal(after, before + 1,
  "run-end return must publish exactly one runtime-changed event so carryover UI renders");

console.log("Safari all-fainted return -> home carryover runtime-changed publication: ok");
