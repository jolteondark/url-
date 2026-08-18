import assert from "node:assert/strict";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const web = await import("../runtime/safari-web-playable-integration.js");
assert.equal(typeof web.prepareSafariNextRun, "function",
  "Safari facade must expose canonical carryover next-run preparation");

const runtime = web.createSafariPlayableRuntime();
const state = runtime.variables.mapless;
const candidate = structuredClone(runtime.player.party[0]);
candidate.personal_id = 270001;
candidate.level = 42;
candidate.hp = 1;
candidate.max_hp = Math.max(99, Number(candidate.max_hp ?? 1));
candidate.status = "POISON";
candidate.status_count = 3;
candidate.item = "POTION";
candidate.ev = {
  HP: 252,
  ATTACK: 252,
  DEFENSE: 4,
  SPECIAL_ATTACK: 0,
  SPECIAL_DEFENSE: 0,
  SPEED: 0,
};
candidate.mapless_bonus_stats = {
  HP: 7,
  ATTACK: 6,
  DEFENSE: 5,
  SPECIAL_ATTACK: 4,
  SPECIAL_DEFENSE: 3,
  SPEED: 2,
};
const originalMoveIds = candidate.moves
  .map((move) => typeof move === "string" ? move : move?.id)
  .filter(Boolean)
  .slice(0, 4);

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
runtime.bag.slots = [["POTION", 99]];
runtime.bag.money = 99999;

const prepared = await web.prepareSafariNextRun(runtime, { boxIndex: 0, slotIndex: 0 });
assert.equal(prepared.result, "prepared", "eligible boxed carryover must prepare the next run");
assert.equal(runtime.storage_system.boxes[0].slots[0] ?? null, null,
  "selected boxed original must be removed only after carry normalization succeeds");
assert.equal(runtime.player.party.length, 1, "next run must begin with exactly one keeper");
const keeper = runtime.player.party[0];
assert.equal(keeper.personal_id, candidate.personal_id, "carry clone must preserve individual identity");
assert.equal(Number(keeper.level), 5, "carried Pokemon level must reset to 5");
assert.deepEqual(Object.values(keeper.ev ?? {}).map(Number), [0, 0, 0, 0, 0, 0],
  "carried Pokemon EVs must reset to zero");
assert.equal(keeper.item ?? null, null, "held item must be removed");
assert.equal(keeper.status ?? "NONE", "NONE", "status must be cleared");
assert.equal(Number(keeper.status_count ?? 0), 0, "status count must be cleared");
assert.deepEqual(
  keeper.moves.map((move) => typeof move === "string" ? move : move?.id).filter(Boolean).slice(0, 4),
  originalMoveIds,
  "carry normalization must preserve the current first four move IDs",
);
assert.ok(Number(keeper.hp) > 0 && Number(keeper.hp) === Number(keeper.max_hp),
  "carried Pokemon must be fully healed after stat recalculation");
assert.deepEqual(Object.values(keeper.mapless_bonus_stats ?? {}).map(Number), [0, 0, 0, 0, 0, 0],
  "Mapless bonus stats must reset");

assert.equal(state.mapless_carry_class, "general", "ordinary eligible carry must use general class");
assert.equal(state.mapless_run_active, true);
assert.equal(state.mapless_run_prepared, true);
assert.equal(state.mapless_carryover_pending, false);
assert.equal(state.mapless_carryover_overflow, false);
assert.equal(state.mapless_run_end_pending, false);
assert.equal(state.location, "day_board", "prepared next run must enter Day Board");
assert.equal(state.board_events.length, 8, "next run must generate an 8-cell Day Board");
assert.equal(state.board_revealed.length, 8);
assert.equal(state.board_consumed.length, 8);
assert.equal(state.board_visited.length, 8);

const quantities = new Map(runtime.bag.slots.filter(Boolean).map(([id, quantity]) => [id, Number(quantity)]));
assert.equal(quantities.get("POKEBALL"), 5, "general carry supplies must include 5 Poke Balls");
assert.equal(quantities.get("POTION"), 3, "general carry supplies must include 3 Potions");
assert.equal(Number(runtime.bag.money), 1000,
  "general carry start money must use the existing public Safari base starting-money owner");
assert.ok(prepared.operations?.some((operation) => operation.op === "request_save"),
  "prepared next run must request persistence");

console.log("Safari carryover home -> boxed keeper -> canonical reset -> supplies -> Day Board: ok");
