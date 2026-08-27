import assert from "node:assert/strict";
import fs from "node:fs";
import { createSafariPlayableRuntime } from "../runtime/safari-playable-integration.js";
import { withBrowserBattleConfusion, browserBattleConfusionTurns } from "../runtime/battle-browser-confusion-transient.js";
import { STATUS_HEALING_ITEM_EFFECTS } from "../runtime/item-status-healing-effects.js";
import {
  applySafariBagItemToPartyPokemon,
  canSafariBagItemTargetPartyPokemon,
  canSafariBagItemUseWithoutTarget,
  isSafariBattleNoTargetItem,
  isSafariStatusHealingItem,
  useSafariBagItemOnPartyPokemon,
} from "../runtime/safari-bag-item-use.js";

function quantity(runtime, id) {
  return (runtime.bag.slots ?? []).reduce((sum, slot) => sum + (slot?.[0] === id ? Number(slot[1]) : 0), 0);
}

const canonicalItems = [
  "AWAKENING", "CHESTOBERRY", "BLUEFLUTE", "POKEFLUTE",
  "ANTIDOTE", "PECHABERRY", "BURNHEAL", "RAWSTBERRY",
  "PARALYZEHEAL", "PARLYZHEAL", "CHERIBERRY", "ICEHEAL", "ASPEARBERRY",
  "FULLHEAL", "LAVACOOKIE", "OLDGATEAU", "CASTELIACONE", "LUMIOSEGALETTE",
  "SHALOURSABLE", "BIGMALASADA", "PEWTERCRUNCHIES", "LUMBERRY", "RAGECANDYBAR",
  "HEALPOWDER", "FULLRESTORE", "PERSIMBERRY", "YELLOWFLUTE",
].sort();
assert.deepEqual(Object.keys(STATUS_HEALING_ITEM_EFFECTS).sort(), canonicalItems);
for (const id of canonicalItems) assert.equal(isSafariStatusHealingItem(id), true, `${id} must be registered`);

const fieldCases = [
  ["AWAKENING", "SLEEP"], ["CHESTOBERRY", "DROWSY"], ["BLUEFLUTE", "SLEEP"], ["POKEFLUTE", "DROWSY"],
  ["ANTIDOTE", "POISON"], ["PECHABERRY", "POISON"], ["BURNHEAL", "BURN"], ["RAWSTBERRY", "BURN"],
  ["PARALYZEHEAL", "PARALYSIS"], ["PARLYZHEAL", "PARALYSIS"], ["CHERIBERRY", "PARALYSIS"],
  ["ICEHEAL", "FROZEN"], ["ASPEARBERRY", "FROSTBITE"],
];
for (const [itemId, status] of fieldCases) {
  const runtime = createSafariPlayableRuntime();
  runtime.player.party[0].status = status;
  runtime.player.party[0].status_count = status === "SLEEP" ? 2 : 0;
  runtime.bag.slots = [[itemId, 1]];
  assert.equal(canSafariBagItemTargetPartyPokemon(runtime, itemId, 0, { context: "field" }), true);
  const used = useSafariBagItemOnPartyPokemon(runtime, { itemId, partyIndex: 0 });
  assert.equal(used.result, "used", `${itemId} must cure ${status}`);
  assert.equal(runtime.player.party[0].status, null);
  assert.equal(runtime.player.party[0].status_count, 0);
  assert.equal(used.persistenceRequested, true);
  const shouldConsume = !["BLUEFLUTE", "POKEFLUTE"].includes(itemId);
  assert.equal(quantity(runtime, itemId), shouldConsume ? 0 : 1, `${itemId} consumption must match PBS`);
}

for (const itemId of ["FULLHEAL", "LAVACOOKIE", "OLDGATEAU", "CASTELIACONE", "LUMIOSEGALETTE", "SHALOURSABLE", "BIGMALASADA", "PEWTERCRUNCHIES", "LUMBERRY", "RAGECANDYBAR"]) {
  const runtime = createSafariPlayableRuntime();
  runtime.player.party[0].status = "POISON";
  runtime.bag.slots = [[itemId, 1]];
  const used = useSafariBagItemOnPartyPokemon(runtime, { itemId, partyIndex: 0 });
  assert.equal(used.result, "used", `${itemId} must cure any primary status`);
  assert.equal(runtime.player.party[0].status, null);
  assert.equal(quantity(runtime, itemId), 0);
}

{
  const runtime = createSafariPlayableRuntime();
  runtime.player.party[0].status = "BURN";
  runtime.player.party[0].happiness = 150;
  runtime.bag.slots = [["HEALPOWDER", 1]];
  const used = useSafariBagItemOnPartyPokemon(runtime, { itemId: "HEALPOWDER", partyIndex: 0 });
  assert.equal(used.result, "used");
  assert.equal(runtime.player.party[0].status, null);
  assert.equal(runtime.player.party[0].happiness, 145, "Heal Powder must apply canonical powder happiness loss");
}

{
  const runtime = createSafariPlayableRuntime();
  runtime.player.party[0].hp = 10;
  runtime.player.party[0].max_hp = 200;
  runtime.player.party[0].status = "PARALYSIS";
  runtime.bag.slots = [["FULLRESTORE", 1]];
  const used = useSafariBagItemOnPartyPokemon(runtime, { itemId: "FULLRESTORE", partyIndex: 0 });
  assert.equal(used.result, "used");
  assert.equal(runtime.player.party[0].hp, 200);
  assert.equal(runtime.player.party[0].status, null);
  assert.ok(used.operations.some((operation) => operation.op === "heal_hp" && operation.amount === 190));
  assert.ok(used.operations.some((operation) => operation.op === "cure_status"));
}

{
  const runtime = createSafariPlayableRuntime();
  runtime.player.party[0].status = null;
  runtime.bag.slots = [["FULLHEAL", 1], ["AWAKENING", 1]];
  const full = useSafariBagItemOnPartyPokemon(runtime, { itemId: "FULLHEAL", partyIndex: 0 });
  const sleep = useSafariBagItemOnPartyPokemon(runtime, { itemId: "AWAKENING", partyIndex: 0 });
  assert.equal(full.result, "no_effect");
  assert.equal(sleep.result, "no_effect");
  assert.equal(quantity(runtime, "FULLHEAL"), 1);
  assert.equal(quantity(runtime, "AWAKENING"), 1);
}

{
  const runtime = createSafariPlayableRuntime();
  const state = runtime.variables.mapless;
  state.battle = { kind: "wild", completed: false, player_party_index: 0, foe: structuredClone(runtime.player.party[0]) };
  runtime.player.party[0] = withBrowserBattleConfusion(runtime.player.party[0], 3);
  runtime.bag.slots = [["POTION", 1], ["FULLHEAL", 1]];
  runtime.player.party[0].hp = 10;
  runtime.player.party[0].max_hp = 200;
  const potion = applySafariBagItemToPartyPokemon(runtime, { itemId: "POTION", partyIndex: 0, context: "battle" });
  assert.equal(potion.result, "used");
  assert.equal(browserBattleConfusionTurns(runtime.player.party[0]), 3, "ordinary HP healing must not accidentally cure browser battle confusion");
  const full = applySafariBagItemToPartyPokemon(runtime, { itemId: "FULLHEAL", partyIndex: 0, context: "battle" });
  assert.equal(full.result, "used");
  assert.equal(browserBattleConfusionTurns(runtime.player.party[0]), 0);
  assert.equal(full.confusionCured, true);
}

for (const [itemId, expectedQty] of [["PERSIMBERRY", 0], ["YELLOWFLUTE", 1]]) {
  const runtime = createSafariPlayableRuntime();
  const state = runtime.variables.mapless;
  state.battle = { kind: "wild", completed: false, player_party_index: 0, foe: structuredClone(runtime.player.party[0]) };
  runtime.player.party[0] = withBrowserBattleConfusion(runtime.player.party[0], 2);
  runtime.bag.slots = [[itemId, 1]];
  assert.equal(canSafariBagItemTargetPartyPokemon(runtime, itemId, 0, { context: "battle" }), true);
  const used = applySafariBagItemToPartyPokemon(runtime, { itemId, partyIndex: 0, context: "battle" });
  assert.equal(used.result, "used");
  assert.equal(browserBattleConfusionTurns(runtime.player.party[0]), 0);
  assert.equal(quantity(runtime, itemId), expectedQty, `${itemId} consumption must match PBS`);
  state.battle = null;
  runtime.bag.slots = [[itemId, 1]];
  assert.equal(useSafariBagItemOnPartyPokemon(runtime, { itemId, partyIndex: 0 }).result, "unsupported_context");
}

{
  const runtime = createSafariPlayableRuntime();
  const state = runtime.variables.mapless;
  runtime.player.party[0].status = "SLEEP";
  const foe = structuredClone(runtime.player.party[0]);
  foe.status = "DROWSY";
  state.battle = { kind: "wild", completed: false, player_party_index: 0, foe };
  runtime.bag.slots = [["POKEFLUTE", 1]];
  assert.equal(isSafariBattleNoTargetItem("POKEFLUTE"), true);
  assert.equal(canSafariBagItemUseWithoutTarget(runtime, "POKEFLUTE", { context: "battle" }), true);
  const used = applySafariBagItemToPartyPokemon(runtime, { itemId: "POKEFLUTE", partyIndex: Number.NaN, context: "battle" });
  assert.equal(used.result, "used");
  assert.equal(used.massWake, true);
  assert.equal(runtime.player.party[0].status, null);
  assert.equal(state.battle.foe.status, null);
  assert.equal(quantity(runtime, "POKEFLUTE"), 1, "Poké Flute is a non-consumable Key Item");
}

{
  const runtime = createSafariPlayableRuntime();
  const state = runtime.variables.mapless;
  runtime.player.party[0].status = "SLEEP";
  runtime.player.party[0].ability_id = "SOUNDPROOF";
  const foe = structuredClone(runtime.player.party[0]);
  state.battle = { kind: "wild", completed: false, player_party_index: 0, foe };
  runtime.bag.slots = [["BLUEFLUTE", 1], ["POKEFLUTE", 1]];
  assert.equal(canSafariBagItemTargetPartyPokemon(runtime, "BLUEFLUTE", 0, { context: "battle" }), false, "Blue Flute must respect active Soundproof");
  assert.equal(canSafariBagItemUseWithoutTarget(runtime, "POKEFLUTE", { context: "battle" }), false, "Poké Flute must not wake Soundproof battlers");
}

const bridgeSource = fs.readFileSync(new URL("../game-menu-bridge.js", import.meta.url), "utf8");
assert.match(bridgeSource, /canSafariBagItemTargetPartyPokemon\(runtime, itemId, index, \{ context \}\)/, "Bag UI target availability must share the runtime item predicate");
assert.match(bridgeSource, /isSafariPartyUseItem\(id, context\)/, "Bag UI must expose status-healing items as well as HP items");
assert.match(bridgeSource, /isSafariBattleNoTargetItem\(id\)/, "Bag UI must support direct Battle-use items such as Poké Flute without a party target");

console.log("Safari canonical status-healing items, Gen 9 statuses, confusion, flutes, Full Restore, UI targeting: ok");
