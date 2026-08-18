import assert from "node:assert/strict";
import { prepareSafariNormalEventV108 } from "../runtime/mapless-normal-event-v108-preparation.js";
import { attemptSafariFlee } from "../runtime/safari-flee-command.js";
import {
  applySafariBoundaryTrialEntry,
  applySafariCampRecovery,
  prepareSafariCampNextDay,
} from "../runtime/safari-camp-next-day-command.js";
import { resolveSafariMachineGachaInteraction } from "../runtime/safari-playable-integration.js";

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
function nextDayIndex(runtime) {
  const index = state(runtime).board_events.findIndex((entry) => entry?.kind === "next_day");
  assert.ok(index >= 0, "generated Day Board must retain one next_day cell");
  return index;
}
function partyIdentity(runtime) {
  return runtime.player.party.map((pokemon, index) => pokemon?.personal_id ?? pokemon?.id ?? pokemon?.uuid ?? `${pokemon?.species}:${index}`);
}

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
const gachaResult = resolveSafariMachineGachaInteraction(runtime, 1, ["buy", "leave"]);
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

// Advance through the same camp owner used by the real UI, then consume the next_day Board cell.
const dayBefore = Number(continuedState.day);
const firstNextDayIndex = nextDayIndex(continued);
const firstCamp = prepareSafariCampNextDay(continued, firstNextDayIndex, true);
applySafariCampRecovery(continued, firstCamp);
const firstBoundary = applySafariBoundaryTrialEntry(continued, firstCamp);
assert.equal(firstBoundary.entered, false, "DAY 2 must remain an ordinary Board floor");
const nextDay = await web.activateSafariDayBoardCell(continued, firstNextDayIndex);
assert.equal(nextDay.result, "day_advanced");
assert.equal(continuedState.day, dayBefore + 1);
assert.equal(continuedState.board_events.length, 8);
assert.deepEqual(continuedState.board_revealed, Array(8).fill(false));
assert.deepEqual(continuedState.board_consumed, Array(8).fill(false));
assert.deepEqual(continuedState.board_visited, Array(8).fill(false));
assert.equal(continuedState.location, "day_board");

// Keep the same continued run alive across ordinary days using only the camp/day owners.
const expectedIdentity = partyIdentity(continued);
while (Number(continuedState.day) < 9) {
  const before = Number(continuedState.day);
  const index = nextDayIndex(continued);
  const camp = prepareSafariCampNextDay(continued, index, true);
  applySafariCampRecovery(continued, camp);
  const boundary = applySafariBoundaryTrialEntry(continued, camp);
  assert.equal(boundary.entered, false, `DAY ${before + 1} must remain an ordinary Board floor`);
  const advanced = await web.activateSafariDayBoardCell(continued, index);
  assert.equal(advanced.result, "day_advanced");
  assert.equal(continuedState.day, before + 1);
  assert.equal(continuedState.location, "day_board");
  assert.deepEqual(continuedState.board_revealed, Array(8).fill(false));
  assert.deepEqual(continuedState.board_consumed, Array(8).fill(false));
  assert.deepEqual(continuedState.board_visited, Array(8).fill(false));
  assert.deepEqual(partyIdentity(continued), expectedIdentity, "camp/day progression must keep the same Party identities");
  assert.deepEqual(continued.bag, expectedBag, "camp/day progression must not recreate or clear Bag/Money");
}

// DAY 9 -> 10 must suspend normal Board progression and enter the existing boundary-trial owner.
assert.equal(continuedState.day, 9);
const boundaryIndex = nextDayIndex(continued);
const suspendedBoard = structuredClone(continuedState.board_events);
const boundaryCamp = prepareSafariCampNextDay(continued, boundaryIndex, true);
assert.equal(Number(boundaryCamp.day_board?.day), 10);
applySafariCampRecovery(continued, boundaryCamp);
const boundaryEntry = applySafariBoundaryTrialEntry(continued, boundaryCamp);
assert.equal(boundaryEntry.entered, true);
assert.equal(continuedState.day, 10);
assert.equal(continuedState.location, "boundary_trial");
assert.equal(continuedState.board_suspended_for_boundary, true);
assert.equal(continuedState.boundary_trial?.result, "preparation_required");
assert.ok(continuedState.boundary_trial?.pending_leader, "boundary owner must materialize a pending leader before presentation");
assert.equal(continuedState.battle, null, "boundary entry must not invent a second Battle before preparation");
assert.deepEqual(continuedState.board_events, suspendedBoard, "DAY 10 must suspend the prior Board instead of generating a normal Board");
assert.deepEqual(partyIdentity(continued), expectedIdentity, "boundary entry must retain the continued Party");
assert.deepEqual(continued.bag, expectedBag, "boundary entry must retain Bag/Money from the continued run");

console.log("Safari fresh -> multi-cell -> save/Continue -> multi-day camp -> boundary progression: ok");
