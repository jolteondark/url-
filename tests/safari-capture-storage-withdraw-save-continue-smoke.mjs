import assert from "node:assert/strict";
import { routeCaughtQueueToPartyStorage } from "../runtime/caught-queue-party-storage.js";

const events = [];
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent(event) { events.push(event.type); return true; } };

const web = await import("../runtime/safari-web-playable-integration.js");

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

const runtime = web.createSafariPlayableRuntime();
const template = structuredClone(runtime.player.party[0]);
assert.ok(template, "playable runtime must start with a Party Pokemon");

runtime.player.party = Array.from({ length: 6 }, (_, index) => ({
  ...structuredClone(template),
  personal_id: 10_000 + index,
  hp: Math.max(1, Number(template.hp ?? template.max_hp ?? 1)),
}));

const captured = {
  ...structuredClone(template),
  species: "PIKACHU",
  personal_id: 0x1234abcd,
  level: 12,
  exp: 1728,
  hp: Math.max(1, Number(template.max_hp ?? template.hp ?? 1) - 3),
  status: "POISON",
  status_count: 2,
  item: "ORANBERRY",
  moves: [
    { id: "THUNDERSHOCK", pp: 7, ppup: 1 },
    { id: "QUICKATTACK", pp: 4, ppup: 0 },
  ],
};

const routed = routeCaughtQueueToPartyStorage({
  party: runtime.player.party,
  boxes: runtime.storage_system.boxes,
  currentBox: runtime.storage_system.currentBox,
}, [captured], { maxPartySize: 6 });
assert.equal(routed.routed.length, 1);
assert.equal(routed.routed[0].result, "box", "full Party capture must route to Storage");
runtime.player.party = routed.state.party;
runtime.storage_system.boxes = routed.state.boxes;
runtime.storage_system.currentBox = routed.state.currentBox;
const { storedBox, storedSlot } = routed.routed[0];
assert.deepEqual(runtime.storage_system.boxes[storedBox].slots[storedSlot], captured,
  "capture handoff must preserve the complete Pokemon state in Storage");

const storage = new MemoryStorage();
web.saveSafariPlayableRun(storage, runtime);
const continued = web.loadSafariPlayableRun(storage, web.createSafariPlayableRuntime());
assert.equal(continued.found, true);
assert.deepEqual(continued.state.storage_system.boxes[storedBox].slots[storedSlot], captured,
  "Continue must preserve the stored captured Pokemon exactly");

assert.equal(typeof web.depositSafariPartyPokemon, "function",
  "lightweight web facade must expose Party -> Storage deposit");
assert.equal(typeof web.withdrawSafariStoragePokemon, "function",
  "lightweight web facade must expose Storage -> Party withdrawal");

const freed = web.depositSafariPartyPokemon(continued.state, 5);
assert.equal(freed.result, true, "a non-last-able Party member must be depositable after Continue");
assert.equal(continued.state.player.party.length, 5);

const withdrawn = web.withdrawSafariStoragePokemon(continued.state, storedBox, storedSlot);
assert.equal(withdrawn.result, true, "captured Pokemon must be withdrawable after Continue");
assert.equal(continued.state.player.party.length, 6);
assert.deepEqual(withdrawn.pokemon, captured,
  "withdraw result must preserve the captured Pokemon identity/state");
assert.deepEqual(continued.state.player.party.at(-1), captured,
  "the same captured Pokemon must return to Party without identity/state drift");

web.saveSafariPlayableRun(storage, continued.state);
const continuedAgain = web.loadSafariPlayableRun(storage, web.createSafariPlayableRuntime());
assert.deepEqual(continuedAgain.state.player.party.at(-1), captured,
  "Save/Continue after withdrawal must preserve the same captured Pokemon");
assert.equal(continuedAgain.state.storage_system.boxes[storedBox].slots[storedSlot], null,
  "withdrawn captured Pokemon must not remain duplicated in Storage");
assert.ok(events.includes("safari-runtime-changed"),
  "Party/Storage facade operations must publish runtime changes for the playable UI");

console.log("Safari full Party capture -> Storage -> Continue -> withdraw -> Continue vertical: PASS");
