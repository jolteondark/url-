import assert from "node:assert/strict";
import { resolveBrowserPlayerReplacementContinuation } from "../runtime/browser-player-replacement-continuation.js";

const handoff = {
  decision: 0,
  playerParty: [
    { name: "Lead", species: "PIKACHU", hp: 0 },
    { name: "BenchA", species: "EEVEE", hp: 30 },
    { name: "BenchB", species: "VULPIX", hp: 40 },
  ],
  playerActivePartyIndex: 0,
  playerActiveFainted: true,
  playerReplacementRequired: true,
  foeParty: [{ name: "Foe", species: "RATTATA", hp: 10 }],
  foeActivePartyIndex: 0,
};

const pending = resolveBrowserPlayerReplacementContinuation({ battleContinuationHandoff: handoff });
assert.equal(pending.result, "replacement_selection_required");
assert.deepEqual(pending.replacementOptions.map((entry) => entry.canSwitchIn), [false, true, true]);

const continued = resolveBrowserPlayerReplacementContinuation({
  battleContinuationHandoff: handoff,
  replacementPartyIndex: 2,
});
assert.equal(continued.result, "continued_with_replacement");
assert.equal(continued.activePlayer.name, "BenchB");
assert.equal(continued.battleContinuationHandoff.playerActivePartyIndex, 2);
assert.equal(continued.battleContinuationHandoff.playerReplacementRequired, false);
assert.deepEqual(continued.partyOrder, [2, 1, 0]);
assert.ok(continued.operations.some((entry) => entry.op === "send_out" && entry.idxParty === 2));

console.log(JSON.stringify({
  ok: true,
  active: continued.activePlayer.name,
  partyOrder: continued.partyOrder,
  operations: continued.operations.map((entry) => entry.op),
}));
