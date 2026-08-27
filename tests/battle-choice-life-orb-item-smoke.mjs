import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CHOICE_ITEM_IDS,
  CHOICE_LIFE_ORB_SOURCE,
  activeChoiceSourceCanonical,
  assertChoiceSelectionCanonical,
  battlerUsedMoveInResolvedRound,
  clearChoiceLockCanonical,
  resolveChoiceSelectionCanonical,
  updateChoiceLockAfterResolvedRound,
} from "../runtime/item-held-choice-life-orb-effects.js";
import {
  resolveAbilityItemActionModifiersCanonical,
  resolveActionAfterAbilityItemHookCanonical,
} from "../runtime/battle-core-ability-item-modifiers.js";
import { resolveBrowserOpponentMoveChoiceCanonical } from "../runtime/battle-core-browser-opponent-move-choice.js";

assert.deepEqual(CHOICE_ITEM_IDS, ["CHOICEBAND", "CHOICESPECS", "CHOICESCARF"]);
assert.equal(CHOICE_LIFE_ORB_SOURCE.choiceMultiplier, 1.5);
assert.equal(CHOICE_LIFE_ORB_SOURCE.lifeOrbMultiplier, 1.3);
assert.deepEqual(CHOICE_LIFE_ORB_SOURCE.lifeOrbRecoilFraction, [1, 10]);

const moves = [{ id: "TACKLE", pp: 20 }, { id: "GROWL", pp: 40 }];
const band = { ability: "OVERGROW", held_item: "CHOICEBAND", moves };
const scarf = { ability: "OVERGROW", held_item: "CHOICESCARF", moves };
assert.equal(activeChoiceSourceCanonical(band), "CHOICEBAND");
assert.equal(activeChoiceSourceCanonical({ ...band, ability: "KLUTZ" }), null);
assert.equal(activeChoiceSourceCanonical({ ...band, held_item: null, ability: "GORILLATACTICS" }), "GORILLATACTICS");

assert.equal(resolveChoiceSelectionCanonical({ pokemon: band, selectedMoveId: "TACKLE", lockedMoveId: null }).allowed, true);
assert.equal(resolveChoiceSelectionCanonical({ pokemon: band, selectedMoveId: "GROWL", lockedMoveId: "TACKLE" }).allowed, false);
assert.throws(
  () => assertChoiceSelectionCanonical({ pokemon: band, selectedMoveId: "GROWL", lockedMoveId: "TACKLE" }),
  /CHOICEBAND only allows TACKLE/,
);
assert.equal(resolveChoiceSelectionCanonical({ pokemon: { ...band, ability: "KLUTZ" }, selectedMoveId: "GROWL", lockedMoveId: "TACKLE" }).allowed, true);

const usedRound = {
  battleRuntimeIntegration: {
    combatTrace: {
      rounds: [{
        actions: [
          { battlerIndex: 0, moveId: "TACKLE", moveSkipped: false },
          { battlerIndex: 1, moveId: "GROWL", moveSkipped: false },
        ],
      }],
    },
  },
};
const skippedRound = {
  battleRuntimeIntegration: {
    combatTrace: {
      rounds: [{ actions: [{ battlerIndex: 0, moveId: "TACKLE", moveSkipped: true }] }],
    },
  },
};
assert.equal(battlerUsedMoveInResolvedRound(usedRound, 0, "TACKLE"), true);
assert.equal(battlerUsedMoveInResolvedRound(skippedRound, 0, "TACKLE"), false);
assert.equal(battlerUsedMoveInResolvedRound(usedRound, 0, "STRUGGLE"), false);

const battle = {};
assert.equal(updateChoiceLockAfterResolvedRound({
  battle,
  pokemon: band,
  selectedMoveId: "TACKLE",
  resolved: skippedRound,
  battlerIndex: 0,
  stateKey: "player_choice_locked_move_id",
}).changed, false);
assert.equal(battle.player_choice_locked_move_id ?? null, null);
assert.equal(updateChoiceLockAfterResolvedRound({
  battle,
  pokemon: band,
  selectedMoveId: "TACKLE",
  resolved: usedRound,
  battlerIndex: 0,
  stateKey: "player_choice_locked_move_id",
}).changed, true);
assert.equal(battle.player_choice_locked_move_id, "TACKLE");
clearChoiceLockCanonical(battle, "player_choice_locked_move_id");
assert.equal(battle.player_choice_locked_move_id, null);

const physical = { type: "NORMAL", category: "Physical", power: 80 };
const special = { type: "PSYCHIC", category: "Special", power: 80 };
assert.equal(resolveAbilityItemActionModifiersCanonical({ user: band, move: physical }).damageMultiplierInput.externalAttackMultiplier, 1.5);
assert.equal(resolveAbilityItemActionModifiersCanonical({ user: { ...band, held_item: "CHOICESPECS" }, move: special }).damageMultiplierInput.externalAttackMultiplier, 1.5);
assert.equal(resolveAbilityItemActionModifiersCanonical({ user: scarf, move: physical }).speedInput.itemMultiplier, 1.5);
assert.equal(resolveAbilityItemActionModifiersCanonical({ user: { ...band, held_item: "LIFEORB" }, move: physical }).damageMultiplierInput.externalFinalDamageMultiplier, 1.3);

const lifeOrbUser = { hp: 100, max_hp: 100, ability: "OVERGROW", held_item: "LIFEORB" };
assert.equal(resolveActionAfterAbilityItemHookCanonical({ user: lifeOrbUser, move: physical, damageDealt: 20 }).userHpDelta, -10);
assert.equal(resolveActionAfterAbilityItemHookCanonical({ user: { ...lifeOrbUser, ability: "MAGICGUARD" }, move: physical, damageDealt: 20 }).userHpDelta, 0);
assert.equal(resolveActionAfterAbilityItemHookCanonical({ user: lifeOrbUser, move: physical, damageDealt: 0 }).userHpDelta, 0);

const foe = {
  ability: "OVERGROW",
  held_item: "CHOICESCARF",
  moves: [{ id: "TACKLE", pp: 20 }, { id: "GROWL", pp: 40 }],
};
const moveMasters = {
  TACKLE: { id: "TACKLE", category: "Physical", power: 40, priority: 0 },
  GROWL: { id: "GROWL", category: "Status", power: 0, priority: 0 },
};
const lockedChoice = resolveBrowserOpponentMoveChoiceCanonical({
  battleKind: "wild",
  player: { moves: [] },
  foe: { ...foe, __battle_choice_locked_move_id: "GROWL" },
  moveMasters,
  aiRandomSeed: 7,
});
assert.equal(lockedChoice.moveId, "GROWL");

const exhausted = resolveBrowserOpponentMoveChoiceCanonical({
  battleKind: "wild",
  player: { moves: [] },
  foe: {
    ...foe,
    __battle_choice_locked_move_id: "GROWL",
    moves: [{ id: "TACKLE", pp: 20 }, { id: "GROWL", pp: 0 }],
  },
  moveMasters,
  aiRandomSeed: 7,
});
assert.equal(exhausted.command, "struggle");
assert.equal(exhausted.reason, "all_moves_out_of_pp");

const safariSource = fs.readFileSync(new URL("../runtime/safari-normal-battle-round.js", import.meta.url), "utf8");
assert.match(safariSource, /player_choice_locked_move_id/);
assert.match(safariSource, /foe_choice_locked_move_id/);
assert.match(safariSource, /clearChoiceLockCanonical\(battle, "player_choice_locked_move_id"\)/);
