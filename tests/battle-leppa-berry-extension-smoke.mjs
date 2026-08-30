import assert from "node:assert/strict";
import {
  applyLeppaBerryPpRestoreCanonical,
  resolveLeppaBerryPpRestoreCanonical,
} from "../runtime/battle-core-leppa-berry-extension.js";
import { resolveHeldItemLifecycle } from "../runtime/battle-held-item-consumption-flow.js";

const pokemon = (extra = {}) => ({
  ability: "NONE",
  held_item: "LEPPABERRY",
  item: "LEPPABERRY",
  moves: [
    { id: "TACKLE", pp: 0, totalPp: 35 },
    { id: "BITE", pp: 10, totalPp: 25 },
  ],
  ...extra,
});

{
  const mon = pokemon();
  const resolution = resolveLeppaBerryPpRestoreCanonical({ pokemon: mon, depletedMoveId: "TACKLE" });
  assert.equal(resolution.triggered, true);
  assert.equal(resolution.moveIndex, 0);
  assert.equal(resolution.restoreAmount, 10);
  assert.equal(resolution.consumeRequest.item, "LEPPABERRY");
  const applied = applyLeppaBerryPpRestoreCanonical({ pokemon: mon, resolution });
  assert.equal(applied.pokemon.moves[0].pp, 10);
  assert.equal(applied.pokemon.moves[1].pp, 10, "Leppa must not retarget another move");
  const consumed = resolveHeldItemLifecycle({
    state: { item: "LEPPABERRY", pokemonItem: "LEPPABERRY", initialItem: "LEPPABERRY" },
    ...resolution.consumeRequest,
  });
  assert.equal(consumed.state.pokemonItem, null);
  assert.equal(consumed.state.initialItem, null, "held Leppa consumption must persist across save/continue");
}

{
  const mon = pokemon({ moves: [{ id: "TACKLE", pp: 1, totalPp: 35 }] });
  const resolution = resolveLeppaBerryPpRestoreCanonical({ pokemon: mon, depletedMoveId: "TACKLE" });
  assert.equal(resolution.triggered, false, "Leppa must not trigger before PP reaches zero");
  assert.equal(resolution.consumeRequest, null);
}

{
  const mon = pokemon({
    moves: [
      { id: "TACKLE", pp: 0, totalPp: 35 },
      { id: "BITE", pp: 0, totalPp: 25 },
    ],
  });
  const resolution = resolveLeppaBerryPpRestoreCanonical({ pokemon: mon, depletedMoveId: "BITE" });
  assert.equal(resolution.moveIndex, 1, "explicit depleted move id must win over another empty move");
}

{
  const mon = pokemon({ ability: "RIPEN" });
  const resolution = resolveLeppaBerryPpRestoreCanonical({ pokemon: mon, depletedMoveId: "TACKLE" });
  assert.equal(resolution.restoreAmount, 20, "Ripen doubles Leppa's PP restoration");
}

{
  const mon = pokemon({ held_item: null, item: "LEPPABERRY" });
  const resolution = resolveLeppaBerryPpRestoreCanonical({ pokemon: mon, depletedMoveId: "TACKLE" });
  assert.equal(resolution.triggered, false, "authoritative cleared held_item must not resurrect a stale legacy item alias");
}

console.log("battle Leppa Berry extension smoke: PASS");
