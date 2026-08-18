import assert from "node:assert/strict";
import { prepareSafariNormalEventV108 } from "../runtime/mapless-normal-event-v108-preparation.js";
import { attemptSafariFlee } from "../runtime/safari-flee-command.js";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const web = await import("../runtime/safari-web-playable-integration.js");

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

function state(runtime) { return runtime.variables.mapless; }
function moveId(move) { return typeof move === "string" ? move : move?.id; }

const runtime = web.createSafariPlayableRuntime();
const current = state(runtime);
runtime.bag.money = 5000;

const gacha = prepareSafariNormalEventV108(
  { kind: "normal_event", normal_event_id: "machine_gacha", normal_seed: 54321, normal_data: {} },
  { day: 1, index: 1, partyFull: false },
);
current.board_events = [
  { kind: "center", slot: 0 },
  { ...gacha, slot: 1 },
  { kind: "wild", type: "BUG", slot: 2 },
  { kind: "trainer", trainer_seed: 12345, slot: 3 },
  { kind: "next_day", slot: 4 },
  { kind: "shop", slot: 5 },
  { kind: "egg_shop", slot: 6 },
  { kind: "center", slot: 7 },
];
current.board_revealed = Array(8).fill(false);
current.board_consumed = Array(8).fill(false);
current.board_visited = Array(8).fill(false);
current.battle = null;
current.shop = null;
current.location = "day_board";

// Facility owner: damage HP/PP, then heal through the actual Safari Day Board entry.
const starter = runtime.player.party[0];
starter.hp = 1;
for (const move of starter.moves) if (typeof move === "object") move.pp = 1;
const center = await web.activateSafariDayBoardCell(runtime, 0);
assert.equal(center.centerOwner.result, "center_healed");
assert.equal(current.board_consumed[0], true);
assert.equal(runtime.player.party[0].hp, runtime.player.party[0].max_hp);

// Canonical normal-event owner: buy one machine-gacha item and leave.
const gachaResult = web.resolveSafariMachineGachaInteraction(runtime, 1, ["buy", "leave"]);
assert.equal(gachaResult.draws, 1);
assert.equal(current.board_consumed[1], true);
assert.equal(current.board_events[1].normal_resolved, true);
assert.equal(runtime.bag.money, 3500);
assert.equal(runtime.bag.slots.reduce((sum, slot) => sum + Number(slot?.[1] ?? 0), 0), 1);

// Wild owner: start through the Board, then escape through the canonical flee owner.
const wildStart = await web.activateSafariDayBoardCell(runtime, 2);
assert.equal(wildStart.result, "dispatched");
assert.equal(current.battle?.kind, "wild");
const wildPlayerIndex = Number(current.battle.player_party_index ?? 0);
runtime.player.party[wildPlayerIndex].stats.SPEED = 999;
current.battle.foe.stats.SPEED = 1;
const escaped = attemptSafariFlee(runtime, { runRandomSeed: 1, randomRoll: 255 });
assert.equal(escaped.escaped, true);
assert.equal(current.battle, null);
assert.equal(current.board_consumed[2], true);
assert.equal(current.board_visited[2], true);

// Trainer owner: start another cell on the same Board, KO a single foe, then return.
const trainerStart = await web.activateSafariDayBoardCell(runtime, 3);
assert.equal(trainerStart.result, "dispatched");
assert.equal(current.battle?.kind, "trainer");
const trainerBattle = current.battle;
trainerBattle.foe.hp = 1;
trainerBattle.foe.fainted = false;
trainerBattle.trainer_party = [structuredClone(trainerBattle.foe)];
trainerBattle.trainer_party_index = 0;
trainerBattle.trainer_party_order = [0];
const activeIndex = Number(trainerBattle.player_party_index ?? 0);
const active = runtime.player.party[activeIndex];
active.stats.ATTACK = 999;
active.stats.SPEED = 999;
const selectedMove = moveId(active.moves[0]);
const ppBefore = Number(active.moves[0]?.pp ?? 0);
const trainerKo = await web.resolveSafariBattleRound(runtime, selectedMove);
assert.equal(trainerKo.decision, 1);
assert.equal(current.battle.completed, true);
const trainerReturn = await web.returnSafariToDayBoard(runtime);
assert.equal(trainerReturn.target, "day_board");
assert.equal(current.battle, null);
assert.equal(current.board_consumed[3], true);
const ppAfter = Number(runtime.player.party[activeIndex].moves[0]?.pp ?? 0);
assert.ok(ppAfter <= ppBefore, "trainer Battle PP must not reset between Board cells");

// Save after several different cells, then Continue into a fresh runtime.
const expectedBoardConsumed = structuredClone(current.board_consumed);
const expectedBoardVisited = structuredClone(current.board_visited);
const expectedParty = structuredClone(runtime.player.party);
const expectedBag = structuredClone(runtime.bag);
const storage = new MemoryStorage();
const saved = web.saveSafariPlayableRun(storage, runtime);
assert.ok(saved.payload);

const fresh = web.createSafariPlayableRuntime();
const loaded = web.loadSafariPlayableRun(storage, fresh);
assert.equal(loaded.found, true);
const continued = loaded.state;
const continuedState = state(continued);
assert.deepEqual(continuedState.board_consumed, expectedBoardConsumed);
assert.deepEqual(continuedState.board_visited, expectedBoardVisited);
assert.deepEqual(continued.player.party, expectedParty, "Continue must preserve HP/PP/Party after multiple cells");
assert.deepEqual(continued.bag, expectedBag, "Continue must preserve Bag/Money after facility/event/Battle cells");
assert.equal(continuedState.location, "day_board");

// Advance through the existing day/floor owner and require the generated next Board state.
const dayBefore = Number(continuedState.day);
const nextDay = await web.activateSafariDayBoardCell(continued, 4);
assert.equal(nextDay.result, "day_advanced");
assert.equal(continuedState.day, dayBefore + 1);
assert.equal(continuedState.board_events.length, 8);
assert.deepEqual(continuedState.board_revealed, Array(8).fill(false));
assert.deepEqual(continuedState.board_consumed, Array(8).fill(false));
assert.deepEqual(continuedState.board_visited, Array(8).fill(false));
assert.equal(continuedState.location, "day_board");

console.log("Safari fresh -> multi-cell -> save/Continue -> next-day Board progression: ok");
