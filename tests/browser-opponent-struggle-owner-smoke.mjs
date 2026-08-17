import assert from "node:assert/strict";
import { resolveBrowserOpponentMoveChoiceCanonical } from "../runtime/battle-core-browser-opponent-move-choice.js";

const foe = {
  moves: [
    { id: "TACKLE", pp: 0 },
    { id: "GROWL", pp: 0 },
  ],
};

const result = resolveBrowserOpponentMoveChoiceCanonical({
  battleKind: "trainer",
  player: {},
  foe,
  moveMasters: {
    TACKLE: { id: "TACKLE" },
    GROWL: { id: "GROWL" },
  },
});

assert.equal(result.command, "struggle");
assert.equal(result.reason, "all_moves_out_of_pp");
assert.equal(result.moveId, "STRUGGLE");
assert.equal(result.moveIndex, 0);
assert.deepEqual(result.choices, []);

assert.throws(
  () => resolveBrowserOpponentMoveChoiceCanonical({ battleKind: "trainer", player: {}, foe: { moves: [] }, moveMasters: {} }),
  /opponent has no moves/,
);

console.log("browser opponent Struggle owner smoke: ok");
