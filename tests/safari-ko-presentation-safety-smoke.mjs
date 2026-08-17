import assert from "node:assert/strict";
import { stabilizeSafariKoPresentation } from "../runtime/safari-ko-presentation-safety.js";

const normal = {
  decision: 0,
  operations: [{ op: "reduce_hp", target: "foe", hpAfter: 10 }],
  presentation: [
    { type: "move_started", actor: "player", target: "foe", moveId: "TACKLE" },
    { type: "damage_applied", actor: "player", target: "foe", hpBefore: 20, hpAfter: 10 },
    { type: "turn_end", turn: 1 },
  ],
};
assert.equal(stabilizeSafariKoPresentation(normal), normal, "non-KO rounds keep the existing animation path");

const replacement = stabilizeSafariKoPresentation({
  decision: 0,
  foeReplacementApplied: true,
  operations: [
    { op: "reduce_hp", target: "foe", hpAfter: 0 },
    { op: "faint", target: "foe" },
    { op: "trainer_send_next", partyIndex: 1, species: "DWEBBLE" },
  ],
  presentation: [
    { type: "move_started", actor: "player", target: "foe", moveId: "TACKLE" },
    { type: "damage_applied", actor: "player", target: "foe", hpBefore: 4, hpAfter: 0 },
    { type: "faint", target: "foe" },
    { type: "trainer_next", actor: "foe", species: "DWEBBLE", partyIndex: 1 },
  ],
});
assert.equal(replacement.safariKoPresentationImmediate, true);
assert.deepEqual(replacement.presentation.map((event) => event.type), ["faint", "trainer_next"]);

const terminal = stabilizeSafariKoPresentation({
  decision: 1,
  operations: [{ op: "faint", target: "foe" }],
  presentation: [
    { type: "move_started", actor: "player", target: "foe", moveId: "TACKLE" },
    { type: "damage_applied", actor: "player", target: "foe", hpBefore: 3, hpAfter: 0 },
    { type: "faint", target: "foe" },
    { type: "battle_result", decision: 1, expGained: 10 },
  ],
});
assert.deepEqual(terminal.presentation.map((event) => event.type), ["faint", "battle_result"]);

console.log("Safari KO presentation safety smoke: ok");
