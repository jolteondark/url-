import assert from "node:assert/strict";
import {
  BATTLE_RESIST_BERRY_COVERAGE_CANONICAL,
  RESIST_BERRY_TYPE_BY_ITEM_CANONICAL,
  resolveResistBerryDamageCanonical,
} from "../runtime/item-held-resist-berry-effects.js";
import { resolveBattleAbilityItemHookCanonical } from "../runtime/battle-ability-item-hook-dispatch.js";
import { commitBattleSystemsHeldItemRuntime } from "../runtime/battle-held-item-runtime-integration.js";

const EXPECTED = Object.freeze({
  BABIRIBERRY: "STEEL", CHARTIBERRY: "ROCK", CHILANBERRY: "NORMAL", CHOPLEBERRY: "FIGHTING",
  COBABERRY: "FLYING", COLBURBERRY: "DARK", HABANBERRY: "DRAGON", KASIBBERRY: "GHOST",
  KEBIABERRY: "POISON", OCCABERRY: "FIRE", PASSHOBERRY: "WATER", PAYAPABERRY: "PSYCHIC",
  RINDOBERRY: "GRASS", ROSELIBERRY: "FAIRY", SHUCABERRY: "GROUND", TANGABERRY: "BUG",
  WACANBERRY: "ELECTRIC", YACHEBERRY: "ICE",
});
assert.deepEqual(RESIST_BERRY_TYPE_BY_ITEM_CANONICAL, EXPECTED);
assert.equal(BATTLE_RESIST_BERRY_COVERAGE_CANONICAL.itemCount, 18);

const passho = resolveResistBerryDamageCanonical({ target: { held_item: "PASSHOBERRY" }, move: { type: "WATER" }, typeMod: 2 });
assert.equal(passho.triggered, true);
assert.equal(passho.finalDamageMultiplier, 0.5);
assert.equal(resolveResistBerryDamageCanonical({ target: { held_item: "PASSHOBERRY" }, move: { type: "WATER" }, typeMod: 1 }).triggered, false);
assert.equal(resolveResistBerryDamageCanonical({ target: { held_item: "CHILANBERRY" }, move: { type: "NORMAL" }, typeMod: 1 }).triggered, true);
assert.equal(resolveResistBerryDamageCanonical({ target: { held_item: "PASSHOBERRY", ability: "RIPEN" }, move: { type: "WATER" }, typeMod: 2 }).finalDamageMultiplier, 0.25);
assert.equal(resolveResistBerryDamageCanonical({ target: { held_item: "PASSHOBERRY", ability: "KLUTZ" }, move: { type: "WATER" }, typeMod: 2 }).triggered, false);
assert.equal(resolveResistBerryDamageCanonical({ target: { held_item: "PASSHOBERRY" }, move: { type: "FIRE" }, typeMod: 2 }).triggered, false);

const before = resolveBattleAbilityItemHookCanonical({
  hook: "action_before",
  user: { ability: "NONE", held_item: null, hp: 100, max_hp: 100 },
  target: { ability: "NONE", held_item: "PASSHOBERRY", hp: 100, max_hp: 100 },
  move: { id: "SURF", type: "WATER", category: "Special", power: 90 },
  context: { typeMod: 2 },
});
assert.equal(before.targetResistBerry.triggered, true);
assert.equal(before.modifiers.targetItem, "PASSHOBERRY");
assert.equal(before.modifiers.damageMultiplierInput.externalFinalDamageMultiplier, 0.5);

const after = resolveBattleAbilityItemHookCanonical({
  hook: "action_after",
  user: { ability: "NONE", held_item: null, hp: 100, max_hp: 100 },
  target: { ability: "NONE", held_item: "PASSHOBERRY", hp: 50, max_hp: 100 },
  move: { id: "SURF", type: "WATER", category: "Special", power: 90 },
  damageDealt: 50,
  context: { typeMod: 2 },
});
assert.equal(after.targetResistBerry.triggered, true);
assert.equal(after.targetResistBerry.consumeRequest.item, "PASSHOBERRY");
const noDamage = resolveBattleAbilityItemHookCanonical({
  hook: "action_after",
  target: { ability: "NONE", held_item: "PASSHOBERRY", hp: 100, max_hp: 100 },
  move: { type: "WATER", category: "Special", power: 90 },
  damageDealt: 0,
  context: { typeMod: 2 },
});
assert.equal(noDamage.targetResistBerry.triggered, false);
assert.equal(noDamage.targetResistBerry.consumeRequest, null);

const pokemon = {
  species: "SQUIRTLE", level: 20, exp: 8000, hp: 50, max_hp: 100,
  stats: { HP: 100, ATTACK: 40, DEFENSE: 50, SPECIAL_ATTACK: 45, SPECIAL_DEFENSE: 50, SPEED: 40 },
  moves: [{ id: "TACKLE", pp: 30, ppup: 0 }], ability: "TORRENT", nature: "HARDY", gender: "MALE",
  status: "NONE", status_count: 0, item: "PASSHOBERRY", held_item: "PASSHOBERRY", form: 0, steps_to_hatch: 0,
};
const consumeRequest = after.targetResistBerry.consumeRequest;
const committed = commitBattleSystemsHeldItemRuntime({
  battleInput: { rounds: [{ priorityOrder: [0], actions: [{ targetBattlerIndex: 0, abilityItemActionAfter: { targetResistBerry: { triggered: true, consumeRequest } } }] }] },
  turn: { operations: [{ op: "use_move", round: 1, action: 0 }] },
  pokemon,
  reflectedBattlerIndex: 0,
});
assert.equal(committed.pokemon.item, null);
assert.ok(committed.commits.some((entry) => entry.source === "resist_berry_action_after"));

console.log("safari held resist berry smoke: ok");
