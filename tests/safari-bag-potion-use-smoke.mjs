import assert from "node:assert/strict";
import fs from "node:fs";
import { createSafariPlayableRuntime, loadSafariPlayableRun, saveSafariPlayableRun } from "../runtime/safari-playable-integration.js";
import { applySafariBagItemToPartyPokemon, useSafariBagItemOnPartyPokemon } from "../runtime/safari-bag-item-use.js";

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

function quantity(runtime, id) {
  return (runtime.bag.slots ?? []).reduce((sum, slot) => sum + (slot?.[0] === id ? Number(slot[1]) : 0), 0);
}

const runtime = createSafariPlayableRuntime();
const state = runtime.variables.mapless;
runtime.bag.slots = [["POTION", 3]];
const pokemon = runtime.player.party[0];
pokemon.personal_id = 329001;
pokemon.hp = 3;
pokemon.max_hp = 28;

const used = useSafariBagItemOnPartyPokemon(runtime, { itemId: "POTION", partyIndex: 0 });
assert.equal(used.result, "used");
assert.equal(used.hpBefore, 3);
assert.equal(used.hpAfter, 23, "canonical Potion must restore exactly 20 HP");
assert.equal(runtime.player.party[0].hp, 23);
assert.equal(quantity(runtime, "POTION"), 2);
assert.ok(used.operations.some((operation) => operation.op === "request_save"));
assert.equal(used.persistenceRequested, true);

runtime.player.party[0].hp = 28;
const full = useSafariBagItemOnPartyPokemon(runtime, { itemId: "POTION", partyIndex: 0 });
assert.equal(full.result, "no_effect");
assert.equal(quantity(runtime, "POTION"), 2, "full-HP target must not consume Potion");

runtime.player.party[0].hp = 0;
const fainted = useSafariBagItemOnPartyPokemon(runtime, { itemId: "POTION", partyIndex: 0 });
assert.equal(fainted.result, "fainted_target");
assert.equal(quantity(runtime, "POTION"), 2, "Potion must not revive or be consumed on a fainted target");

runtime.player.party[0].hp = 8;
state.battle = { kind: "wild", completed: false };
const battleBlocked = useSafariBagItemOnPartyPokemon(runtime, { itemId: "POTION", partyIndex: 0 });
assert.equal(battleBlocked.result, "battle_active", "field Bag owner must not bypass Battle command ownership");
assert.equal(quantity(runtime, "POTION"), 2);

const battleUse = applySafariBagItemToPartyPokemon(runtime, { itemId: "POTION", partyIndex: 0, context: "battle" });
assert.equal(battleUse.result, "used", "Battle owner must be able to reuse the same canonical Potion effect");
assert.equal(runtime.player.party[0].hp, 28);
assert.equal(quantity(runtime, "POTION"), 1);
assert.equal(battleUse.persistenceRequested, false, "Battle item effect must not save before the Battle action resolves");
assert.ok(battleUse.operations.some((operation) => operation.op === "use_item_on_pokemon" && operation.context === "battle"));
assert.ok(!battleUse.operations.some((operation) => operation.op === "request_save"));
state.battle = null;

runtime.player.party[0].hp = 8;
const second = useSafariBagItemOnPartyPokemon(runtime, { itemId: "POTION", partyIndex: 0 });
assert.equal(second.result, "used");
assert.equal(runtime.player.party[0].hp, 28, "Potion must cap healing at max HP");
assert.equal(quantity(runtime, "POTION"), 0);

const storage = new MemoryStorage();
saveSafariPlayableRun(storage, runtime);
const loaded = loadSafariPlayableRun(storage, createSafariPlayableRuntime());
assert.equal(loaded.found, true);
assert.equal(loaded.state.player.party[0].personal_id, 329001);
assert.equal(loaded.state.player.party[0].hp, 28);
assert.equal(quantity(loaded.state, "POTION"), 0, "consumed Potion must remain consumed after Continue");

const bridgeSource = fs.readFileSync(new URL("../game-menu-bridge.js", import.meta.url), "utf8");
assert.match(bridgeSource, /globalThis\.__maplessSafariRuntime/, "Bag menu must use the live preview runtime");
assert.doesNotMatch(bridgeSource, /createSafariPlayableRuntime/, "Bag rendering must not create a fallback runtime");
assert.doesNotMatch(bridgeSource, /loadSafariPlayableRun/, "Bag rendering must not replace live runtime from storage");
assert.match(bridgeSource, /data\.bagUseItem|dataset\.bagUseItem/, "Bag menu must expose an item-use action");

console.log("Safari shared Potion effect, field save semantics, Battle reuse, Continue continuity: ok");
