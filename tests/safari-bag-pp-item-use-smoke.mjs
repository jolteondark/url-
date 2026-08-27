import assert from "node:assert/strict";
import fs from "node:fs";
import { PP_ITEM_EFFECTS } from "../runtime/item-pp-effects.js";
import {
  applySafariBagItemToPartyPokemon,
  canSafariBagItemTargetPartyPokemon,
  isSafariMoveSelectionItem,
  isSafariPartyUseItem,
  safariBagItemMoveOptions,
  useSafariBagItemOnPartyPokemon,
} from "../runtime/safari-bag-item-use.js";
import { createSafariPlayableRuntime } from "../runtime/safari-playable-integration.js";

function quantity(runtime, id) {
  return (runtime.bag.slots ?? []).reduce((sum, slot) => sum + (slot?.[0] === id ? Number(slot[1]) : 0), 0);
}

function setMoves(runtime, moves) {
  runtime.player.party[0].moves = moves.map((move) => ({ ppup: 0, ...move }));
}

assert.deepEqual(Object.keys(PP_ITEM_EFFECTS).sort(), ["ELIXIR", "ETHER", "HOPOBERRY", "LEPPABERRY", "MAXELIXIR", "MAXETHER", "PPMAX", "PPUP"].sort());
for (const id of ["ETHER", "LEPPABERRY", "HOPOBERRY", "MAXETHER", "ELIXIR", "MAXELIXIR"]) {
  assert.equal(isSafariPartyUseItem(id, "field"), true);
  assert.equal(isSafariPartyUseItem(id, "battle"), true);
}
assert.equal(isSafariPartyUseItem("PPUP", "field"), true);
assert.equal(isSafariPartyUseItem("PPMAX", "field"), true);
assert.equal(isSafariPartyUseItem("PPUP", "battle"), false);
assert.equal(isSafariPartyUseItem("PPMAX", "battle"), false);
assert.equal(isSafariMoveSelectionItem("ETHER", "field"), true);
assert.equal(isSafariMoveSelectionItem("MAXETHER", "battle"), true);
assert.equal(isSafariMoveSelectionItem("LEPPABERRY", "battle"), true);
assert.equal(isSafariMoveSelectionItem("HOPOBERRY", "battle"), true);
assert.equal(isSafariMoveSelectionItem("ELIXIR", "field"), false);
assert.equal(isSafariMoveSelectionItem("PPUP", "field"), true);

{
  const runtime = createSafariPlayableRuntime();
  setMoves(runtime, [{ id: "TACKLE", pp: 5 }, { id: "QUICKATTACK", pp: 30 }]);
  runtime.bag.slots = [["ETHER", 1]];
  const options = safariBagItemMoveOptions(runtime, "ETHER", 0);
  assert.equal(options[0].usable, true);
  assert.equal(options[0].pp, 5);
  assert.equal(options[0].totalPp, 35);
  assert.equal(options[1].usable, false);
  const used = useSafariBagItemOnPartyPokemon(runtime, { itemId: "ETHER", partyIndex: 0, moveIndex: 0 });
  assert.equal(used.result, "used");
  assert.equal(runtime.player.party[0].moves[0].pp, 15);
  assert.equal(quantity(runtime, "ETHER"), 0);
  assert.equal(used.persistenceRequested, true);
  assert.ok(used.operations.some((operation) => operation.op === "restore_pp" && operation.amount === 10));
}

{
  const runtime = createSafariPlayableRuntime();
  setMoves(runtime, [{ id: "TACKLE", pp: 34 }, { id: "QUICKATTACK", pp: 1 }]);
  runtime.bag.slots = [["MAXETHER", 1], ["LEPPABERRY", 1]];
  let used = useSafariBagItemOnPartyPokemon(runtime, { itemId: "MAXETHER", partyIndex: 0, moveIndex: 0 });
  assert.equal(used.result, "used");
  assert.equal(runtime.player.party[0].moves[0].pp, 35);
  used = useSafariBagItemOnPartyPokemon(runtime, { itemId: "LEPPABERRY", partyIndex: 0, moveIndex: 1 });
  assert.equal(runtime.player.party[0].moves[1].pp, 11);
}

{
  const runtime = createSafariPlayableRuntime();
  setMoves(runtime, [{ id: "TACKLE", pp: 7 }]);
  runtime.bag.slots = [["HOPOBERRY", 1]];
  const used = useSafariBagItemOnPartyPokemon(runtime, { itemId: "HOPOBERRY", partyIndex: 0, moveIndex: 0 });
  assert.equal(used.result, "used", "Gen 9 Hopo Berry must copy Ether/Leppa direct-use behavior");
  assert.equal(runtime.player.party[0].moves[0].pp, 17);
  assert.equal(quantity(runtime, "HOPOBERRY"), 0);
}

{
  const runtime = createSafariPlayableRuntime();
  setMoves(runtime, [{ id: "TACKLE", pp: 1 }, { id: "QUICKATTACK", pp: 29 }, { id: "BITE", pp: 25 }]);
  runtime.bag.slots = [["ELIXIR", 1], ["MAXELIXIR", 1]];
  let used = useSafariBagItemOnPartyPokemon(runtime, { itemId: "ELIXIR", partyIndex: 0 });
  assert.equal(used.result, "used");
  assert.deepEqual(runtime.player.party[0].moves.map((move) => move.pp), [11, 30, 25]);
  used = useSafariBagItemOnPartyPokemon(runtime, { itemId: "MAXELIXIR", partyIndex: 0 });
  assert.equal(used.result, "used");
  assert.deepEqual(runtime.player.party[0].moves.map((move) => move.pp), [35, 30, 25]);
}

{
  const runtime = createSafariPlayableRuntime();
  setMoves(runtime, [{ id: "TACKLE", pp: 20, ppup: 0 }]);
  runtime.bag.slots = [["PPUP", 1], ["PPMAX", 2]];
  let used = useSafariBagItemOnPartyPokemon(runtime, { itemId: "PPUP", partyIndex: 0, moveIndex: 0 });
  assert.equal(used.result, "used");
  assert.equal(runtime.player.party[0].moves[0].ppup, 1);
  assert.equal(runtime.player.party[0].moves[0].pp, 20, "PP Up must not restore current PP");
  assert.equal(used.ppChanges[0].totalPpAfter, 42);
  used = useSafariBagItemOnPartyPokemon(runtime, { itemId: "PPMAX", partyIndex: 0, moveIndex: 0 });
  assert.equal(runtime.player.party[0].moves[0].ppup, 3);
  assert.equal(runtime.player.party[0].moves[0].pp, 20, "PP Max must not restore current PP");
  assert.equal(used.ppChanges[0].totalPpAfter, 56);
  const noEffect = useSafariBagItemOnPartyPokemon(runtime, { itemId: "PPMAX", partyIndex: 0, moveIndex: 0 });
  assert.equal(noEffect.result, "no_effect");
  assert.equal(quantity(runtime, "PPMAX"), 1, "maxed move must not consume PP Max");
}

{
  const runtime = createSafariPlayableRuntime();
  setMoves(runtime, [{ id: "TACKLE", pp: 5 }]);
  runtime.player.party[0].hp = 0;
  runtime.bag.slots = [["ETHER", 2]];
  assert.equal(canSafariBagItemTargetPartyPokemon(runtime, "ETHER", 0, { context: "field" }), true, "field Ether may target a fainted Pokemon");
  const field = useSafariBagItemOnPartyPokemon(runtime, { itemId: "ETHER", partyIndex: 0, moveIndex: 0 });
  assert.equal(field.result, "used");
  assert.equal(runtime.player.party[0].moves[0].pp, 15);

  runtime.player.party[0].moves[0].pp = 5;
  runtime.variables.mapless.battle = { kind: "wild", completed: false, player_party_index: 0 };
  assert.equal(canSafariBagItemTargetPartyPokemon(runtime, "ETHER", 0, { context: "battle" }), false, "battle Ether requires an able Pokemon");
  const battleFainted = applySafariBagItemToPartyPokemon(runtime, { itemId: "ETHER", partyIndex: 0, moveIndex: 0, context: "battle" });
  assert.equal(battleFainted.result, "fainted_target");
  assert.equal(quantity(runtime, "ETHER"), 1);
}

{
  const runtime = createSafariPlayableRuntime();
  setMoves(runtime, [{ id: "TACKLE", pp: 5 }, { id: "QUICKATTACK", pp: 2 }]);
  runtime.bag.slots = [["ETHER", 1]];
  runtime.variables.mapless.battle = { kind: "wild", completed: false, player_party_index: 0 };
  const battle = applySafariBagItemToPartyPokemon(runtime, { itemId: "ETHER", partyIndex: 0, moveIndex: 1, context: "battle" });
  assert.equal(battle.result, "used");
  assert.equal(runtime.player.party[0].moves[0].pp, 5, "selected Battle move must be preserved");
  assert.equal(runtime.player.party[0].moves[1].pp, 12, "selected Battle move must receive Ether");
  assert.equal(battle.persistenceRequested, false);
  assert.ok(!battle.operations.some((operation) => operation.op === "request_save"));
}

const bridgeSource = fs.readFileSync(new URL("../game-menu-bridge.js", import.meta.url), "utf8");
assert.match(bridgeSource, /bag-move-select/, "Bag must expose canonical move selection for single-move PP items");
assert.match(bridgeSource, /safariBagItemMoveOptions/, "Bag move picker must share the PP owner eligibility");
assert.match(bridgeSource, /moveIndex/, "Bag commands must forward the selected move index");
const lifecycleSource = fs.readFileSync(new URL("../runtime/safari-normal-battle-lifecycle.js", import.meta.url), "utf8");
assert.match(lifecycleSource, /moveIndex = undefined/, "normal Battle item owner must accept selected move index");
assert.match(lifecycleSource, /partyIndex: targetIndex,\s*moveIndex,\s*context: "battle"/, "normal Battle item owner must forward selected move index to the shared Bag handler");

console.log("Safari canonical PP recovery/PP Up item group, field/Battle targeting and move selection: ok");
