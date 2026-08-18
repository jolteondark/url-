import assert from "node:assert/strict";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

const web = await import("../runtime/safari-web-playable-integration.js");
const storage = new MemoryStorage();
const runtime = web.createSafariPlayableRuntime();
const state = runtime.variables.mapless;

const candidate = structuredClone(runtime.player.party[0]);
candidate.personal_id = 276001;
candidate.nature_id = "ADAMANT";
candidate.level = 44;
candidate.hp = 1;
candidate.status = "POISON";
candidate.status_count = 2;
candidate.item = "POTION";
runtime.player.party = [];
runtime.storage_system.boxes[0].slots[0] = structuredClone(candidate);
state.mapless_run_active = false;
state.mapless_run_prepared = false;
state.mapless_run_end_pending = false;
state.mapless_carryover_pending = true;
state.mapless_carryover_overflow = false;
state.location = "home";
state.board_events = [];
state.board_revealed = [];
state.board_consumed = [];
state.board_visited = [];

const prepared = await web.prepareSafariNextRun(runtime, { boxIndex: 0, slotIndex: 0 });
assert.equal(prepared.result, "prepared");
assert.equal(state.mapless_run_active, true);
assert.equal(state.mapless_run_prepared, true);
assert.equal(state.mapless_carryover_pending, false);
assert.equal(runtime.player.party.length, 1);
assert.equal(runtime.player.party[0].personal_id, 276001);
assert.equal(runtime.player.party[0].nature_id, "ADAMANT");
assert.equal(Number(runtime.player.party[0].level), 5);
assert.equal(runtime.storage_system.boxes[0].slots[0] ?? null, null);

const combatIndex = state.board_events.findIndex((event) => event?.kind === "wild" || event?.kind === "trainer");
assert.ok(combatIndex >= 0, "prepared Day Board must contain an ordinary combat cell");
state.board_revealed[combatIndex] = true;
const boardBefore = structuredClone(state.board_events);
const bagBefore = structuredClone(runtime.bag);
const keeperBefore = structuredClone(runtime.player.party[0]);

const saved = web.saveSafariPlayableRun(storage, runtime);
assert.ok(saved?.key, "prepared next run must persist through the existing Safari storage owner");

const fresh = web.createSafariPlayableRuntime();
const loaded = web.loadSafariPlayableRun(storage, fresh);
assert.equal(loaded.found, true, "fresh runtime must Continue the prepared next run");
const resumed = loaded.state;
const resumedState = resumed.variables.mapless;
assert.equal(resumedState.mapless_run_active, true);
assert.equal(resumedState.mapless_run_prepared, true);
assert.equal(resumedState.mapless_carryover_pending, false);
assert.equal(resumedState.location, "day_board");
assert.deepEqual(resumedState.board_events, boardBefore,
  "Continue must restore the prepared Board instead of generating another Board");
assert.deepEqual(resumed.bag, bagBefore, "carry class supplies/money must survive Continue");
assert.equal(resumed.player.party.length, 1);
assert.equal(resumed.player.party[0].personal_id, keeperBefore.personal_id,
  "Continue must preserve the carried individual identity");
assert.equal(resumed.player.party[0].nature_id, keeperBefore.nature_id);
assert.equal(Number(resumed.player.party[0].level), 5);
assert.equal(resumed.storage_system.boxes[0].slots[0] ?? null, null,
  "selected Storage original must stay removed after Continue");

const started = await web.activateSafariDayBoardCell(resumed, combatIndex);
assert.equal(started.result, "dispatched", "restored ordinary combat cell must start Battle");
assert.ok(resumedState.battle && !resumedState.battle.completed);
assert.equal(Number(resumedState.battle.player_party_index ?? 0), 0);
assert.equal(resumed.player.party[0].personal_id, 276001,
  "the carried keeper must be the active Battle instance after Continue");

const active = resumed.player.party[0];
const move = active.moves[0];
const moveId = typeof move === "string" ? move : move?.id;
assert.ok(moveId, "carried keeper must retain a usable first move");
const ppBefore = typeof move === "string" ? null : Number(move.pp);
const turn = await web.resolveSafariBattleRound(resumed, moveId);
assert.ok([0, 1, 2].includes(Number(turn.decision)), "first next-run command must resolve through the ordinary Battle owner");
assert.ok(Number(resumed.player.party[0].hp) >= 0, "active keeper HP must remain reflected after the command");
if (ppBefore !== null && Number(turn.decision) !== 2) {
  assert.ok(Number(resumed.player.party[0].moves[0].pp) <= ppBefore,
    "carried keeper PP must be owned by the same persisted Battle instance");
}

console.log("Safari carryover prepare -> save -> fresh Continue -> same Board -> first Battle command: ok");
