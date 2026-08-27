import assert from "node:assert/strict";
import fs from "node:fs";
import { createSafariPlayableRuntime, loadSafariPlayableRun, saveSafariPlayableRun } from "../runtime/safari-playable-integration.js";
import { HP_HEALING_ITEM_EFFECTS } from "../runtime/item-hp-healing-effects.js";
import { applySafariBagItemToPartyPokemon, isSafariHpHealingItem, useSafariBagItemOnPartyPokemon } from "../runtime/safari-bag-item-use.js";
import { resolveWoundedHealingItemEffect } from "../runtime/wounded-healing-item-effect.js";

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

function quantity(runtime, id) {
  return (runtime.bag.slots ?? []).reduce((sum, slot) => sum + (slot?.[0] === id ? Number(slot[1]) : 0), 0);
}

const expectedHp = Object.freeze({
  POTION: 30,
  BERRYJUICE: 30,
  SWEETHEART: 30,
  SUPERPOTION: 70,
  HYPERPOTION: 130,
  MAXPOTION: 200,
  FRESHWATER: 40,
  SODAPOP: 60,
  LEMONADE: 80,
  MOOMOOMILK: 110,
  ORANBERRY: 20,
  SITRUSBERRY: 60,
  ENERGYPOWDER: 70,
  ENERGYROOT: 130,
  CANARIBREAD: 110,
});

assert.deepEqual(Object.keys(HP_HEALING_ITEM_EFFECTS).sort(), Object.keys(expectedHp).sort(), "canonical direct HP-healing item inventory must stay exact");

for (const [itemId, hpAfter] of Object.entries(expectedHp)) {
  const runtime = createSafariPlayableRuntime();
  const pokemon = runtime.player.party[0];
  pokemon.personal_id = 329001;
  pokemon.hp = 10;
  pokemon.max_hp = 200;
  pokemon.happiness = 150;
  runtime.bag.slots = [[itemId, 1]];

  assert.equal(isSafariHpHealingItem(itemId), true, `${itemId} must be registered as a canonical HP-healing item`);
  const used = useSafariBagItemOnPartyPokemon(runtime, { itemId, partyIndex: 0 });
  assert.equal(used.result, "used", `${itemId} must be usable from the field Bag`);
  assert.equal(used.hpAfter, hpAfter, `${itemId} must use its canonical Gen 9 healing amount`);
  assert.equal(runtime.player.party[0].hp, hpAfter);
  assert.equal(quantity(runtime, itemId), 0, `${itemId} must consume exactly one item on success`);
  assert.equal(used.persistenceRequested, true);
  assert.ok(used.operations.some((operation) => operation.op === "request_save"));

  const expectedHappiness = itemId === "ENERGYPOWDER" ? 145 : itemId === "ENERGYROOT" ? 140 : 150;
  assert.equal(runtime.player.party[0].happiness, expectedHappiness, `${itemId} happiness side effect must match Essentials`);
  if (itemId === "ENERGYPOWDER" || itemId === "ENERGYROOT") {
    assert.ok(used.operations.some((operation) => operation.op === "change_happiness" && operation.happiness_after === expectedHappiness));
  }

  const wounded = resolveWoundedHealingItemEffect({ itemId, hp: 10, maxHp: 200, status: "NONE" });
  assert.equal(wounded.used, true, `${itemId} wounded-event projection must share the HP item owner`);
  assert.equal(wounded.hp_after, hpAfter);
}

{
  const runtime = createSafariPlayableRuntime();
  const state = runtime.variables.mapless;
  const pokemon = runtime.player.party[0];
  pokemon.hp = 200;
  pokemon.max_hp = 200;
  runtime.bag.slots = [["POTION", 1]];
  const full = useSafariBagItemOnPartyPokemon(runtime, { itemId: "POTION", partyIndex: 0 });
  assert.equal(full.result, "no_effect");
  assert.equal(quantity(runtime, "POTION"), 1, "full-HP target must not consume an HP-healing item");

  pokemon.hp = 0;
  const fainted = useSafariBagItemOnPartyPokemon(runtime, { itemId: "POTION", partyIndex: 0 });
  assert.equal(fainted.result, "fainted_target");
  assert.equal(quantity(runtime, "POTION"), 1, "direct HP-healing items must not revive or be consumed on a fainted target");

  pokemon.hp = 10;
  runtime.bag.slots.push(["RAGECANDYBAR", 1]);
  const rage = useSafariBagItemOnPartyPokemon(runtime, { itemId: "RAGECANDYBAR", partyIndex: 0 });
  assert.equal(rage.result, "unsupported_item", "Gen 9 Rage Candy Bar belongs to the status-cure owner, not HP healing");
  assert.equal(quantity(runtime, "RAGECANDYBAR"), 1);

  state.battle = { kind: "wild", completed: false };
  runtime.bag.slots.push(["HYPERPOTION", 1]);
  const battleUse = applySafariBagItemToPartyPokemon(runtime, { itemId: "HYPERPOTION", partyIndex: 0, context: "battle" });
  assert.equal(battleUse.result, "used");
  assert.equal(battleUse.hpBefore, 10);
  assert.equal(battleUse.hpAfter, 130);
  assert.equal(quantity(runtime, "HYPERPOTION"), 0);
  assert.equal(battleUse.persistenceRequested, false, "Battle item effect must not save before the Battle action resolves");
  assert.ok(!battleUse.operations.some((operation) => operation.op === "request_save"));
  state.battle = null;

  const storage = new MemoryStorage();
  saveSafariPlayableRun(storage, runtime);
  const loaded = loadSafariPlayableRun(storage, createSafariPlayableRuntime());
  assert.equal(loaded.found, true);
  assert.equal(loaded.state.player.party[0].hp, 130);
  assert.equal(quantity(loaded.state, "HYPERPOTION"), 0, "consumed healing item must remain consumed after Continue");
}

const bridgeSource = fs.readFileSync(new URL("../game-menu-bridge.js", import.meta.url), "utf8");
assert.match(bridgeSource, /globalThis\.__maplessSafariRuntime/, "Bag menu must use the live preview runtime");
assert.match(bridgeSource, /isSafariHpHealingItem\(id\)/, "Bag menu must expose every registered HP-healing item, not only Potion");
assert.doesNotMatch(bridgeSource, /if \(id === "POTION"\) \{\s*const \{ select, hasTarget \}/, "Bag use control must not remain Potion-only");
assert.match(bridgeSource, /data\.bagUseItem|dataset\.bagUseItem/, "Bag menu must expose an item-use action");

console.log("Safari canonical HP-healing item group, bitter medicine, field/Battle reuse, Continue continuity: ok");
