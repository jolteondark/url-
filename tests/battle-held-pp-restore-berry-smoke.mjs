import assert from "node:assert/strict";
import fs from "node:fs";
import {
  HELD_PP_RESTORE_BERRY_ITEM_IDS_CANONICAL,
  HELD_PP_RESTORE_BERRY_SOURCE_CANONICAL,
  commitHeldPpRestoreBerryCanonical,
  resolveHeldPpRestoreBerryCanonical,
  resolvedBattlerCompletedMoveCanonical,
} from "../runtime/item-held-pp-restore-berry-effects.js";

const moveMasters = {
  TACKLE: { id: "TACKLE", total_pp: 35 },
  CLOSECOMBAT: { id: "CLOSECOMBAT", total_pp: 5 },
};
const usedRound = {
  battleRuntimeIntegration: { combatTrace: { rounds: [{ actions: [{ kind: "move", battlerIndex: 0, moveId: "STRUGGLE", moveSkipped: false }] }] } },
};
const skippedRound = {
  battleRuntimeIntegration: { combatTrace: { rounds: [{ actions: [{ kind: "move", battlerIndex: 0, moveId: "TACKLE", moveSkipped: true }] }] } },
};

assert.deepEqual(HELD_PP_RESTORE_BERRY_ITEM_IDS_CANONICAL, ["LEPPABERRY", "HOPOBERRY"]);
assert.equal(HELD_PP_RESTORE_BERRY_SOURCE_CANONICAL.baseRestore, 10);
assert.equal(resolvedBattlerCompletedMoveCanonical(usedRound, 0), true);
assert.equal(resolvedBattlerCompletedMoveCanonical(skippedRound, 0), false);

const leppa = { hp: 50, max_hp: 50, ability: "OVERGROW", held_item: "LEPPABERRY", moves: [{ id: "CLOSECOMBAT", pp: 0, ppup: 0 }, { id: "TACKLE", pp: 0, ppup: 0 }] };
const restored = commitHeldPpRestoreBerryCanonical({ pokemon: leppa, opposingPokemon: {}, moveMasters, completedMove: true });
assert.equal(restored.resolution.triggered, true);
assert.equal(restored.resolution.moveIndex, 0);
assert.equal(restored.resolution.ppAfter, 5);
assert.equal(restored.pokemon.moves[0].pp, 5);
assert.equal(restored.pokemon.moves[1].pp, 0);
assert.equal(restored.pokemon.held_item, null);

const ripen = commitHeldPpRestoreBerryCanonical({ pokemon: { ...leppa, ability: "RIPEN", held_item: "HOPOBERRY", moves: [{ id: "TACKLE", pp: 0, ppup: 0 }] }, opposingPokemon: {}, moveMasters, completedMove: true });
assert.equal(ripen.resolution.ripen, true);
assert.equal(ripen.resolution.ppAfter, 20);
assert.equal(ripen.pokemon.moves[0].pp, 20);

const unnerve = resolveHeldPpRestoreBerryCanonical({ pokemon: leppa, opposingPokemon: { hp: 20, ability: "UNNERVE" }, moveMasters, completedMove: true });
assert.equal(unnerve.triggered, false);
assert.equal(unnerve.reason, "blocked_by_unnerve");
assert.equal(unnerve.consumeRequest, null);

const faintedUnnerve = resolveHeldPpRestoreBerryCanonical({ pokemon: leppa, opposingPokemon: { hp: 0, ability: "UNNERVE" }, moveMasters, completedMove: true });
assert.equal(faintedUnnerve.triggered, true);
assert.equal(faintedUnnerve.reason, "restore_zero_pp_move");

const laterFaintStillTriggered = resolveHeldPpRestoreBerryCanonical({ pokemon: { ...leppa, hp: 0 }, opposingPokemon: {}, moveMasters, completedMove: true, activeAtTrigger: true });
assert.equal(laterFaintStillTriggered.triggered, true);

const klutz = resolveHeldPpRestoreBerryCanonical({ pokemon: { ...leppa, ability: "KLUTZ" }, moveMasters, completedMove: true });
assert.equal(klutz.triggered, false);
assert.equal(klutz.reason, "no_active_pp_restore_berry");

const noMove = resolveHeldPpRestoreBerryCanonical({ pokemon: leppa, moveMasters, completedMove: false });
assert.equal(noMove.triggered, false);
assert.equal(noMove.reason, "move_not_completed");

const wrapper = fs.readFileSync(new URL("../runtime/safari-normal-battle-round.js", import.meta.url), "utf8");
assert.match(wrapper, /commitHeldPpRestoreBerryCanonical/);
assert.match(wrapper, /SAFARI_MOVE_MASTERS/);
assert.match(wrapper, /resolvedBattlerCompletedMoveCanonical/);
