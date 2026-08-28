import assert from "node:assert/strict";
import {
  HELD_STATUS_CURE_BERRY_ITEM_IDS_CANONICAL,
  commitHeldStatusCureBerryCanonical,
  resolveHeldStatusCureBerryCanonical,
} from "../runtime/item-held-status-cure-berry-effects.js";
import { projectBrowserBattleConfusionAfterRound } from "../runtime/battle-browser-confusion-transient.js";

const mon = (item, status = "NONE", extra = {}) => ({
  species: "PIKACHU",
  hp: 50,
  max_hp: 100,
  item,
  ability_id: "STATIC",
  status,
  status_count: status === "NONE" ? 0 : 2,
  ...extra,
});

assert.deepEqual(HELD_STATUS_CURE_BERRY_ITEM_IDS_CANONICAL, [
  "ASPEARBERRY", "CHERIBERRY", "CHESTOBERRY", "LUMBERRY", "PECHABERRY", "PERSIMBERRY", "RAWSTBERRY",
]);

let result = commitHeldStatusCureBerryCanonical({ pokemon: mon("CHERIBERRY", "PARALYSIS") });
assert.equal(result.resolution.triggered, true);
assert.equal(result.pokemon.status, "NONE");
assert.equal(result.pokemon.item, null);

result = commitHeldStatusCureBerryCanonical({ pokemon: mon("CHERIBERRY", "BURN") });
assert.equal(result.resolution.triggered, false);
assert.equal(result.pokemon.status, "BURN");
assert.equal(result.pokemon.item, "CHERIBERRY");

for (const [item, status] of [["CHESTOBERRY", "DROWSY"], ["ASPEARBERRY", "FROSTBITE"]]) {
  result = commitHeldStatusCureBerryCanonical({ pokemon: mon(item, status) });
  assert.equal(result.resolution.triggered, true, `${item} should cure ${status}`);
  assert.equal(result.pokemon.status, "NONE");
  assert.equal(result.pokemon.item, null);
}

result = commitHeldStatusCureBerryCanonical({ pokemon: mon("PERSIMBERRY", "BURN"), confusionTurns: 3 });
assert.equal(result.resolution.confusionCured, true);
assert.equal(result.resolution.statusCured, false);
assert.equal(result.confusionTurns, 0);
assert.equal(result.pokemon.status, "BURN");
assert.equal(result.pokemon.item, null);

result = commitHeldStatusCureBerryCanonical({ pokemon: mon("LUMBERRY", "POISON"), confusionTurns: 2 });
assert.equal(result.resolution.statusCured, true);
assert.equal(result.resolution.confusionCured, true);
assert.equal(result.pokemon.status, "NONE");
assert.equal(result.confusionTurns, 0);
assert.equal(result.pokemon.item, null);

result = commitHeldStatusCureBerryCanonical({
  pokemon: mon("LUMBERRY", "BURN"),
  confusionTurns: 2,
  opposingPokemon: mon(null, "NONE", { ability_id: "UNNERVE" }),
});
assert.equal(result.resolution.triggered, false);
assert.equal(result.resolution.blockedByBerrySuppression, true);
assert.equal(result.pokemon.status, "BURN");
assert.equal(result.confusionTurns, 2);
assert.equal(result.pokemon.item, "LUMBERRY");

result = commitHeldStatusCureBerryCanonical({
  pokemon: mon("LUMBERRY", "BURN"),
  opposingPokemon: mon(null, "NONE", { ability_id: "UNNERVE", hp: 0 }),
});
assert.equal(result.resolution.triggered, true);
assert.equal(result.pokemon.item, null);

for (const holder of [
  mon("LUMBERRY", "BURN", { ability_id: "KLUTZ" }),
  mon("LUMBERRY", "BURN", { hp: 0 }),
]) {
  const blocked = resolveHeldStatusCureBerryCanonical({ pokemon: holder });
  assert.equal(blocked.triggered, false);
}

const projected = projectBrowserBattleConfusionAfterRound({
  preparedRound: { actions: [] },
  playerBefore: mon("PERSIMBERRY", "NONE", { __battle_confusion_turns: 3 }),
  foeBefore: mon(null),
  playerAfter: mon("PERSIMBERRY", "NONE"),
  foeAfter: mon(null),
});
assert.equal(projected.turns.player, 0);
assert.equal(projected.player.item, null);
assert.equal(projected.heldStatusCureBerry.player.triggered, true);

console.log("battle held status cure berry smoke passed");
