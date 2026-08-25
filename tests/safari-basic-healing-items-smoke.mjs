import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  canSafariItemTargetPokemon,
  getSafariItemDisplayName,
  getSafariItemEffect,
  resolveSafariPartyItemEffect,
} from "../runtime/safari-item-effects.js";
import {
  applySafariBagItemToPartyPokemon,
  useSafariBagItemOnPartyPokemon,
} from "../runtime/safari-bag-item-use.js";

const CASES = [
  ["POTION", "キズぐすり", 20],
  ["SUPERPOTION", "いいキズぐすり", 60],
  ["HYPERPOTION", "すごいキズぐすり", 120],
  ["MAXPOTION", "まんたんのくすり", "full"],
];

function runtimeWith(itemId, { hp = 10, maxHp = 200, battle = null } = {}) {
  return {
    variables: { mapless: battle ? { battle } : {} },
    player: {
      party: [{ species: "EEVEE", level: 10, moves: [], hp, max_hp: maxHp }],
    },
    bag: { slots: [[itemId, 1]], money: 0 },
  };
}

for (const [id, nameJa, amount] of CASES) {
  const effect = getSafariItemEffect(id.toLowerCase());
  assert.ok(effect, `${id} must resolve case-insensitively`);
  assert.equal(effect.kind, "heal_hp");
  assert.equal(getSafariItemDisplayName(id), nameJa);

  const target = { hp: 10, max_hp: 200, steps_to_hatch: 0 };
  assert.equal(canSafariItemTargetPokemon(target, id), true);
  const resolved = resolveSafariPartyItemEffect(target, id);
  assert.equal(resolved.usable, true);
  assert.equal(resolved.hpAfter, amount === "full" ? 200 : 10 + amount);

  const runtime = runtimeWith(id);
  const result = useSafariBagItemOnPartyPokemon(runtime, { itemId: id, partyIndex: 0 });
  assert.equal(result.used, true, `${id} must be usable in the field`);
  assert.equal(result.persistenceRequested, true);
  assert.equal(runtime.player.party[0].hp, amount === "full" ? 200 : 10 + amount);
  assert.equal(runtime.bag.slots.length, 0, `${id} must be consumed exactly once`);
}

{
  const runtime = runtimeWith("HYPERPOTION", { hp: 190, maxHp: 200 });
  const result = useSafariBagItemOnPartyPokemon(runtime, { itemId: "HYPERPOTION", partyIndex: 0 });
  assert.equal(result.hpAfter, 200, "fixed healing must clamp at max HP");
  assert.equal(result.operations.find((operation) => operation.op === "heal_hp")?.amount, 10);
}

{
  const runtime = runtimeWith("SUPERPOTION", { hp: 0 });
  const result = useSafariBagItemOnPartyPokemon(runtime, { itemId: "SUPERPOTION", partyIndex: 0 });
  assert.equal(result.result, "fainted_target");
  assert.equal(result.used, false);
  assert.deepEqual(runtime.bag.slots, [["SUPERPOTION", 1]], "non-revive healing must not consume on a fainted target");
}

{
  const runtime = runtimeWith("MAXPOTION", { hp: 200 });
  const result = useSafariBagItemOnPartyPokemon(runtime, { itemId: "MAXPOTION", partyIndex: 0 });
  assert.equal(result.result, "no_effect");
  assert.equal(result.used, false);
  assert.deepEqual(runtime.bag.slots, [["MAXPOTION", 1]], "full-HP targets must not consume medicine");
}

{
  const runtime = runtimeWith("SUPERPOTION", { battle: { completed: false } });
  const result = applySafariBagItemToPartyPokemon(runtime, {
    itemId: "SUPERPOTION",
    partyIndex: 0,
    context: "battle",
  });
  assert.equal(result.used, true, "the shared battle item owner must accept the same supported medicine");
  assert.equal(result.persistenceRequested, false, "battle item use remains owned by the battle lifecycle");
}

const menu = await readFile(new URL("../game-menu-bridge.js", import.meta.url), "utf8");
assert.match(menu, /isSafariPartyItemSupported\(id\)/,
  "Bag UI must expose supported party items through shared effect metadata");
assert.match(menu, /getSafariItemDisplayName\(id\)/,
  "Bag UI must use shared item names rather than a POTION-only label branch");
assert.doesNotMatch(menu, /id === "POTION"/,
  "Bag UI must not regress to POTION-only affordances");

console.log("Safari basic healing item smoke passed");
