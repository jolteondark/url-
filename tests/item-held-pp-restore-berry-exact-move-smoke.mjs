import assert from "node:assert/strict";
import {
  commitHeldPpRestoreBerryCanonical,
  resolveHeldPpRestoreBerryCanonical,
} from "../runtime/item-held-pp-restore-berry-effects.js";

const moveMasters = Object.freeze({
  TACKLE: Object.freeze({ total_pp: 35 }),
  GROWL: Object.freeze({ total_pp: 40 }),
});

function holder(item = "LEPPABERRY", tacklePp = 0, growlPp = 0) {
  return {
    hp: 20,
    held_item: item,
    moves: [
      { id: "TACKLE", pp: tacklePp, ppup: 0 },
      { id: "GROWL", pp: growlPp, ppup: 0 },
    ],
  };
}

{
  const resolution = resolveHeldPpRestoreBerryCanonical({
    pokemon: holder(),
    moveMasters,
    completedMove: true,
    completedMoveId: "GROWL",
  });
  assert.equal(resolution.triggered, true);
  assert.equal(resolution.moveIndex, 1, "the berry must restore the exact move just used, not the first stale 0-PP move");
  assert.equal(resolution.moveId, "GROWL");
  assert.equal(resolution.ppAfter, 10);
}

{
  const resolution = resolveHeldPpRestoreBerryCanonical({
    pokemon: holder(),
    moveMasters,
    completedMove: true,
    completedMoveId: null,
  });
  assert.equal(resolution.triggered, false, "target-only/other-battler completion must not fire a held PP berry");
  assert.equal(resolution.reason, "completed_move_unknown");
}

{
  const resolution = resolveHeldPpRestoreBerryCanonical({
    pokemon: holder("LEPPABERRY", 1, 0),
    moveMasters,
    completedMove: true,
    completedMoveId: "TACKLE",
  });
  assert.equal(resolution.triggered, false, "a stale 0-PP move must not be restored when the move just used still has PP");
  assert.equal(resolution.reason, "completed_move_not_at_zero_pp");
}

{
  const committed = commitHeldPpRestoreBerryCanonical({
    pokemon: holder("LEPPABERRY", 0, 0),
    moveMasters,
    completedMove: true,
    completedMoveId: "GROWL",
  });
  assert.equal(committed.resolution.triggered, true);
  assert.equal(committed.pokemon.moves[0].pp, 0);
  assert.equal(committed.pokemon.moves[1].pp, 10);
  assert.equal(committed.pokemon.held_item, null, "successful exact-move restoration must consume the held berry");
}

{
  const resolution = resolveHeldPpRestoreBerryCanonical({
    pokemon: holder("HOPOBERRY", 0, 0),
    moveMasters,
    completedMove: true,
    completedMoveId: "GROWL",
  });
  assert.equal(resolution.triggered, true, "the shared Gen 9 Pack copy must retain the same exact-move contract");
  assert.equal(resolution.moveIndex, 1);
}

console.log("held PP restore berry exact-move smoke: ok");