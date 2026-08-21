import assert from "node:assert/strict";
import { resolveNormalPlayActionBeforeAbilityItemExtensionCanonical } from "../runtime/battle-core-ability-item-normal-play-extension.js";

const pokemon = (ability = "NONE", extra = {}) => ({
  ability,
  held_item: null,
  status: "NONE",
  hp: 100,
  max_hp: 100,
  ...extra,
});

const physicalMove = { id: "TACKLE", type: "NORMAL", category: "Physical", power: 40 };
const specialMove = { id: "WATERGUN", type: "WATER", category: "Special", power: 40 };

{
  const result = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: pokemon(),
    target: pokemon("MARVELSCALE", { status: "PARALYSIS" }),
    move: physicalMove,
  });
  assert.equal(result.damageMultiplierInput.externalDefenseMultiplier, 1.5);
}

{
  const result = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: pokemon(),
    target: pokemon("MARVELSCALE", { status: "NONE" }),
    move: physicalMove,
  });
  assert.equal(result.damageMultiplierInput.externalDefenseMultiplier, 1);
}

{
  const result = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: pokemon(),
    target: pokemon("MARVELSCALE", { status: "BURN" }),
    move: specialMove,
  });
  assert.equal(result.damageMultiplierInput.externalDefenseMultiplier, 1);
}

{
  const result = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: pokemon("MOLDBREAKER"),
    target: pokemon("MARVELSCALE", { status: "POISON" }),
    move: physicalMove,
  });
  assert.equal(result.damageMultiplierInput.externalDefenseMultiplier, 1);
}

{
  const result = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: pokemon(),
    target: { ability: null, ability_id: "MARVELSCALE", status: "POISON", held_item: null },
    move: physicalMove,
  });
  assert.equal(result.damageMultiplierInput.externalDefenseMultiplier, 1);
}

console.log("battle ability/item Marvel Scale smoke: PASS");
