import assert from "node:assert/strict";
import {
  HELD_METRONOME_SOURCE_CANONICAL,
  METRONOME_CALLS_ANOTHER_MOVE_FUNCTION_CODES_CANONICAL,
  clearMetronomeBattleStateCanonical,
  injectMetronomeBattleStateCanonical,
  resolveHeldMetronomePowerCanonical,
  updateMetronomeBattleStateAfterResolvedRoundCanonical,
} from "../runtime/item-held-metronome-effects.js";
import { resolveBattleAbilityItemHookCanonical } from "../runtime/battle-ability-item-hook-dispatch.js";

const move = { id: "TACKLE", type: "NORMAL", category: "Physical", power: 40, function_code: "None" };
const user = {
  ability: "NONE",
  held_item: "METRONOME",
  __battle_metronome_counter: 0,
  __battle_metronome_last_move_id: "TACKLE",
  __battle_metronome_last_move_failed: false,
};

assert.equal(HELD_METRONOME_SOURCE_CANONICAL.maxCounter, 5);
assert.equal(HELD_METRONOME_SOURCE_CANONICAL.maxFinalDamageMultiplier, 2);
assert.equal(METRONOME_CALLS_ANOTHER_MOVE_FUNCTION_CODES_CANONICAL.length, 7);

const secondUse = resolveHeldMetronomePowerCanonical({ user, move });
assert.equal(secondUse.counter, 1);
assert.equal(secondUse.finalDamageMultiplier, 1.2);

let chained = { ...user };
for (const expected of [1, 2, 3, 4, 5, 5]) {
  const resolved = resolveHeldMetronomePowerCanonical({ user: chained, move });
  assert.equal(resolved.counter, expected);
  chained = { ...chained, __battle_metronome_counter: resolved.counter };
}
assert.equal(resolveHeldMetronomePowerCanonical({ user: chained, move }).finalDamageMultiplier, 2);

assert.equal(resolveHeldMetronomePowerCanonical({
  user: { ...user, __battle_metronome_counter: 4, __battle_metronome_last_move_failed: true },
  move,
}).counter, 0);
assert.equal(resolveHeldMetronomePowerCanonical({
  user: { ...user, __battle_metronome_counter: 4 },
  move: { id: "COPYCAT", function_code: "UseLastMoveUsed" },
}).counter, 4);
assert.equal(resolveHeldMetronomePowerCanonical({
  user: { ...user, ability: "KLUTZ", __battle_metronome_counter: 4 },
  move,
}).finalDamageMultiplier, 1);

const hook = resolveBattleAbilityItemHookCanonical({ hook: "action_before", user, target: {}, move, context: {} });
assert.equal(hook.userMetronome.counter, 1);
assert.equal(hook.modifiers.damageMultiplierInput.externalFinalDamageMultiplier, 1.2);

const battle = {
  player_metronome_counter: 2,
  player_metronome_last_move_id: "TACKLE",
  player_metronome_last_move_failed: false,
};
const before = injectMetronomeBattleStateCanonical({ held_item: "METRONOME", ability: "NONE" }, battle, "player");
updateMetronomeBattleStateAfterResolvedRoundCanonical({
  battle,
  side: "player",
  pokemonBefore: before,
  battlerIndex: 0,
  resolved: {
    battleRuntimeIntegration: {
      combatTrace: { rounds: [{ actions: [{ battlerIndex: 0, moveId: "TACKLE", functionCode: "None", lastMoveFailed: false }] }] },
    },
  },
});
assert.equal(battle.player_metronome_counter, 3);
assert.equal(battle.player_metronome_last_move_id, "TACKLE");

battle.player_metronome_counter = 3;
battle.player_metronome_last_move_id = "TACKLE";
battle.player_metronome_last_move_failed = false;
const beforeMiss = injectMetronomeBattleStateCanonical({ held_item: "METRONOME", ability: "NONE" }, battle, "player");
updateMetronomeBattleStateAfterResolvedRoundCanonical({
  battle,
  side: "player",
  pokemonBefore: beforeMiss,
  battlerIndex: 0,
  resolved: {
    battleRuntimeIntegration: {
      combatTrace: { rounds: [{ actions: [{ battlerIndex: 0, moveId: "TACKLE", functionCode: "None", lastMoveFailed: true }] }] },
    },
  },
});
assert.equal(battle.player_metronome_counter, 4);
assert.equal(battle.player_metronome_last_move_failed, true);
const afterMiss = injectMetronomeBattleStateCanonical({ held_item: "METRONOME", ability: "NONE" }, battle, "player");
assert.equal(resolveHeldMetronomePowerCanonical({ user: afterMiss, move }).counter, 0);

clearMetronomeBattleStateCanonical(battle, "player");
assert.equal(battle.player_metronome_counter, 0);
assert.equal(battle.player_metronome_last_move_id, null);
