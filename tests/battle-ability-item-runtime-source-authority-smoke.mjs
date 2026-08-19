import assert from "node:assert/strict";
import {
  battlePokemonAbilityIdCanonical,
  battlePokemonHeldItemIdCanonical,
  resolveChoiceLockCanonical,
  resolveSurvivalAbilityItemHookCanonical,
  resolveTurnEndHeldItemEffectCanonical,
} from "../runtime/battle-core-ability-item-modifiers.js";

assert.equal(
  battlePokemonAbilityIdCanonical({ ability: null, ability_id: "STURDY" }),
  "",
  "explicit Pokemon Runtime ability=null must not revive a stale legacy ability_id",
);
assert.equal(
  battlePokemonHeldItemIdCanonical({ held_item: null, item: "FOCUSSASH" }),
  "",
  "explicit Pokemon Runtime held_item=null must not revive a stale legacy item alias",
);

assert.equal(
  battlePokemonAbilityIdCanonical({ ability_id: "INTIMIDATE" }),
  "INTIMIDATE",
  "legacy saves without the authoritative ability field may still use ability_id",
);
assert.equal(
  battlePokemonHeldItemIdCanonical({ item: "LEFTOVERS" }),
  "LEFTOVERS",
  "legacy saves without the authoritative held_item field may still use item",
);

const staleChoice = resolveChoiceLockCanonical({
  pokemon: { held_item: null, item: "CHOICEBAND" },
  selectedMoveId: "TACKLE",
});
assert.equal(staleChoice.active, false, "consumed/cleared Choice item must not be revived by pokemon.item");

const staleLeftovers = resolveTurnEndHeldItemEffectCanonical({
  held_item: null,
  item: "LEFTOVERS",
  hp: 50,
  max_hp: 100,
});
assert.equal(staleLeftovers.triggered, false, "cleared held_item must suppress stale Leftovers alias");

const staleSash = resolveSurvivalAbilityItemHookCanonical({
  target: {
    ability: null,
    ability_id: "STURDY",
    held_item: null,
    item: "FOCUSSASH",
    hp: 100,
    max_hp: 100,
  },
  incomingDamage: 150,
});
assert.equal(staleSash.triggered, false, "cleared runtime ability/item must not revive Sturdy or Focus Sash");

const legacySash = resolveSurvivalAbilityItemHookCanonical({
  target: { item: "FOCUSSASH", hp: 100, max_hp: 100 },
  incomingDamage: 150,
});
assert.equal(legacySash.triggered, true, "legacy item-only Pokemon remains compatible when held_item is absent");
assert.equal(legacySash.consumeRequest?.permanent, true, "Focus Sash remains a permanent consume request");

console.log("battle ability/item runtime source authority smoke: PASS");
