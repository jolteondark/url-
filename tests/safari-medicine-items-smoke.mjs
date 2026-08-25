import assert from "node:assert/strict";
import {
  canSafariItemTargetPokemon,
  resolveSafariPartyItemEffect,
} from "../runtime/safari-item-effects.js";
import {
  applySafariBagItemToPartyPokemon,
  useSafariBagItemOnPartyPokemon,
} from "../runtime/safari-bag-item-use.js";

function pokemon(overrides = {}) {
  return {
    species: "EEVEE",
    level: 10,
    moves: [],
    hp: 50,
    max_hp: 100,
    status: null,
    status_count: 0,
    steps_to_hatch: 0,
    ...overrides,
  };
}

function runtimeWith(itemId, target, { battle = null } = {}) {
  return {
    variables: { mapless: battle ? { battle } : {} },
    player: { party: [target] },
    bag: { slots: [[itemId, 1]], money: 0 },
  };
}

const STATUS_CASES = [
  ["ANTIDOTE", "POISON"],
  ["PARALYZEHEAL", "PARALYSIS"],
  ["AWAKENING", "SLEEP"],
  ["BURNHEAL", "BURN"],
  ["ICEHEAL", "FROZEN"],
];

for (const [itemId, status] of STATUS_CASES) {
  const target = pokemon({ status, status_count: 3 });
  assert.equal(canSafariItemTargetPokemon(target, itemId), true, `${itemId} must target ${status}`);
  const resolved = resolveSafariPartyItemEffect(target, itemId);
  assert.equal(resolved.usable, true);
  assert.equal(resolved.statusCured, true);
  assert.deepEqual(resolved.pokemonPatch, { status: null, status_count: 0 });

  const runtime = runtimeWith(itemId, target);
  const result = useSafariBagItemOnPartyPokemon(runtime, { itemId, partyIndex: 0 });
  assert.equal(result.used, true);
  assert.equal(runtime.player.party[0].status, null);
  assert.equal(runtime.player.party[0].status_count, 0);
  assert.equal(runtime.bag.slots.length, 0);
}

{
  const target = pokemon({ status: "POISON" });
  const runtime = runtimeWith("BURNHEAL", target);
  const result = useSafariBagItemOnPartyPokemon(runtime, { itemId: "BURNHEAL", partyIndex: 0 });
  assert.equal(result.used, false, "wrong single-status medicine must not be consumed");
  assert.equal(result.result, "no_effect");
  assert.deepEqual(runtime.bag.slots, [["BURNHEAL", 1]]);
}

{
  const target = pokemon({ status: "TOXIC", status_count: 4, mapless_overworld_confusion: true });
  const runtime = runtimeWith("FULLHEAL", target);
  const result = useSafariBagItemOnPartyPokemon(runtime, { itemId: "FULLHEAL", partyIndex: 0 });
  assert.equal(result.used, true);
  assert.equal(runtime.player.party[0].status, null);
  assert.equal(runtime.player.party[0].status_count, 0);
  assert.equal(runtime.player.party[0].mapless_overworld_confusion, false);
  assert.equal(result.statusCured, true);
  assert.equal(result.confusionCured, true);
}

{
  const target = pokemon({ hp: 40, status: "BURN", mapless_overworld_confusion: true });
  const runtime = runtimeWith("FULLRESTORE", target);
  const result = useSafariBagItemOnPartyPokemon(runtime, { itemId: "FULLRESTORE", partyIndex: 0 });
  assert.equal(result.used, true);
  assert.equal(runtime.player.party[0].hp, 100);
  assert.equal(runtime.player.party[0].status, null);
  assert.equal(runtime.player.party[0].mapless_overworld_confusion, false);
}

{
  const target = pokemon({ hp: 0, status: null, max_hp: 101 });
  const runtime = runtimeWith("REVIVE", target);
  const result = useSafariBagItemOnPartyPokemon(runtime, { itemId: "REVIVE", partyIndex: 0 });
  assert.equal(result.used, true);
  assert.equal(runtime.player.party[0].hp, 50, "Revive restores floor(max HP / 2)");
  assert.ok(result.operations.some((operation) => operation.op === "revive"));
}

{
  const target = pokemon({ hp: 0, max_hp: 1 });
  const runtime = runtimeWith("REVIVE", target);
  const result = useSafariBagItemOnPartyPokemon(runtime, { itemId: "REVIVE", partyIndex: 0 });
  assert.equal(result.used, true);
  assert.equal(runtime.player.party[0].hp, 1, "Revive must restore a 1-HP Pokémon to 1 HP");
}

{
  const target = pokemon({ hp: 0, max_hp: 101 });
  const runtime = runtimeWith("MAXREVIVE", target);
  const result = useSafariBagItemOnPartyPokemon(runtime, { itemId: "MAXREVIVE", partyIndex: 0 });
  assert.equal(result.used, true);
  assert.equal(runtime.player.party[0].hp, 101);
}

{
  const target = pokemon({ hp: 1 });
  for (const itemId of ["REVIVE", "MAXREVIVE"]) {
    const runtime = runtimeWith(itemId, target);
    const result = useSafariBagItemOnPartyPokemon(runtime, { itemId, partyIndex: 0 });
    assert.equal(result.used, false, `${itemId} must not be consumed on a conscious target`);
    assert.equal(result.result, "not_fainted");
  }
}

{
  const target = pokemon({ status: "PARALYSIS" });
  const runtime = runtimeWith("FULLHEAL", target, { battle: { completed: false } });
  const result = applySafariBagItemToPartyPokemon(runtime, {
    itemId: "FULLHEAL",
    partyIndex: 0,
    context: "battle",
  });
  assert.equal(result.used, true, "battle item owner must share medicine effects");
  assert.equal(result.persistenceRequested, false);
  assert.equal(runtime.player.party[0].status, null);
}

console.log("Safari medicine item smoke passed");
