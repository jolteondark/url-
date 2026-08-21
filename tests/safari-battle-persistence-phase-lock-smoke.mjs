import assert from "node:assert/strict";
import fs from "node:fs";

const adapterSource = fs.readFileSync(
  new URL("../battle-phase-ui-adapter.js", import.meta.url),
  "utf8",
);

assert.match(adapterSource, /const persistenceAllowed = commandAllowed \|\| resultReady/,
  "manual Save/Continue must be available only at stable COMMAND or RESULT Battle checkpoints");
assert.match(adapterSource, /for \(const id of \["save-run", "continue-run"\]\)/,
  "central phase UI must own transient Battle locking for Save and Continue");
assert.match(adapterSource, /setOwnerAwarePhaseInteractive\(byId\(id\), persistenceAllowed\)/,
  "phase locking must preserve the persistence owner's pre-existing disabled state");
assert.match(adapterSource, /target\.closest\("#save-run,#continue-run"\)\) return phase === COMMAND_PHASE \|\| phase === RESULT_PHASE/,
  "capture-phase click guard must reject Save/Continue during ACTION/CHECK/replacement/growth/RETURN");
assert.match(adapterSource, /function releaseBattlePhaseLocks\(\)/,
  "central phase UI must release transient owner-aware locks after Battle state is cleared");
assert.match(adapterSource, /if \(!currentBattle\) \{\s*releaseBattlePhaseLocks\(\);\s*return;\s*\}/,
  "RETURN completion must not strand Save/Continue or transient Battle controls in phase-locked disabled state");

console.log("Safari Battle Save/Continue central-phase lock smoke passed");