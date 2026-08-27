import assert from "node:assert/strict";
import {
  HELD_PP_RESTORE_BERRY_ITEM_IDS_CANONICAL,
  resolveHeldPpRestoreBerryAfterMoveCanonical,
} from "../runtime/item-held-pp-berry-effects.js";
import { commitBattleSystemsPpRuntime } from "../runtime/battle-move-pp-integration.js";

assert.deepEqual(HELD_PP_RESTORE_BERRY_ITEM_IDS_CANONICAL, ["HOPOBERRY", "LEPPABERRY"]);

const basePokemon = {
  species: "PIKACHU", level: 50, hp: 100, item: "LEPPABERRY", ability_id: "STATIC",
  moves: [{ id: "TACKLE", pp: 0, ppup: 0 }, { id: "GROWL", pp: 5, ppup: 0 }],
};
let result = resolveHeldPpRestoreBerryAfterMoveCanonical({ pokemon: basePokemon, context: { baseTotalPpByIndex: { 0: 35 } } });
assert.equal(result.triggered, true);
assert.equal(result.moveIndex, 0);
assert.equal(result.ppAfter, 10);
assert.equal(result.consumeRequest?.item, "LEPPABERRY");

result = resolveHeldPpRestoreBerryAfterMoveCanonical({
  pokemon: { ...basePokemon, item: "HOPOBERRY", ability_id: "RIPEN" },
  context: { baseTotalPpByIndex: { 0: 35 } },
});
assert.equal(result.ppAfter, 20);
assert.equal(result.ripen, true);

result = resolveHeldPpRestoreBerryAfterMoveCanonical({
  pokemon: { ...basePokemon, moves: [{ id: "TACKLE", pp: 5, ppup: 0 }, { id: "GROWL", pp: 0, ppup: 0 }] },
  context: { baseTotalPpByIndex: { 1: 10 } },
});
assert.equal(result.moveIndex, 1);
assert.equal(result.ppAfter, 10);

result = resolveHeldPpRestoreBerryAfterMoveCanonical({ pokemon: basePokemon, opposing: { ability: "UNNERVE" }, context: { baseTotalPpByIndex: { 0: 35 } } });
assert.equal(result.triggered, false);
assert.equal(result.reason, "berry_consumption_blocked");

result = resolveHeldPpRestoreBerryAfterMoveCanonical({ pokemon: { ...basePokemon, ability_id: "KLUTZ" }, context: { baseTotalPpByIndex: { 0: 35 } } });
assert.equal(result.triggered, false);
assert.equal(result.reason, "item_inactive");

result = resolveHeldPpRestoreBerryAfterMoveCanonical({ pokemon: basePokemon });
assert.equal(result.triggered, false);
assert.equal(result.reason, "unknown_total_pp");

const battleInput = {
  rounds: [{ actions: [{
    kind: "move", moveIndex: 0,
    targetPokemon: { ability: "STATIC" },
    battlePpInput: { pokemonMoveIndex: 0, baseTotalPp: 35, reflectToPokemon: true },
    battlePpResolution: { commitEligible: true, runtimePp: 0 },
  }] }],
};
const committed = commitBattleSystemsPpRuntime({
  battleInput,
  turn: { operations: [{ op: "use_move", round: 1, action: 0 }] },
  pokemon: { ...basePokemon, moves: [{ id: "TACKLE", pp: 1, ppup: 0 }, { id: "GROWL", pp: 5, ppup: 0 }] },
});
assert.equal(committed.pokemon.moves[0].pp, 10);
assert.equal(committed.pokemon.item, null);
assert.equal(committed.ppBerryCommits.length, 1);
assert.equal(committed.ppBerryCommits[0].source, "held_pp_restore_berry");

console.log("battle held PP berry smoke passed");
