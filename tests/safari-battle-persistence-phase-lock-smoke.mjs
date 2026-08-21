import assert from "node:assert/strict";
import fs from "node:fs";

const adapterSource = fs.readFileSync(
  new URL("../battle-phase-ui-adapter.js", import.meta.url),
  "utf8",
);

assert.match(adapterSource, /const persistenceAllowed = commandAllowed \|\| resultReady/,
  "manual Save/Continue must be available only at stable COMMAND or RESULT Battle checkpoints");
assert.match(adapterSource, /for \(const id of \["new-run", "save-run", "continue-run"\]\)/,
  "central phase UI must release transient Battle locks for New Run, Save, and Continue");
assert.match(adapterSource, /setOwnerAwarePhaseInteractive\(byId\("new-run"\), false\)/,
  "New Run must remain unavailable while any Battle phase is active so it cannot replace the orchestrated runtime");
assert.match(adapterSource, /for \(const id of \["save-run", "continue-run"\]\)/,
  "central phase UI must own transient Battle locking for Save and Continue");
assert.match(adapterSource, /setOwnerAwarePhaseInteractive\(byId\(id\), persistenceAllowed\)/,
  "phase locking must preserve the persistence owner's pre-existing disabled state while Battle is active");
assert.match(adapterSource, /target\.closest\("#new-run"\)\) return false/,
  "capture-phase click guard must reject New Run throughout an active Battle");
assert.match(adapterSource, /target\.closest\("#save-run,#continue-run"\)\) return phase === COMMAND_PHASE \|\| phase === RESULT_PHASE/,
  "capture-phase click guard must reject Save/Continue during ACTION/CHECK/replacement/growth/RETURN");
assert.match(adapterSource, /function releaseOwnerAwarePhaseLock\(element\)/,
  "Battle clear must have a distinct phase-lock release path");
assert.match(adapterSource, /function releaseBattlePhaseLocks\(\)/,
  "central phase UI must release transient owner-aware locks after Battle state is cleared");
assert.match(adapterSource, /releaseOwnerAwarePhaseLock\(byId\(id\)\)/,
  "Battle clear must release the phase lock without replaying a stale owner-disabled snapshot");
const releaseBlock = adapterSource.slice(
  adapterSource.indexOf("function releaseOwnerAwarePhaseLock"),
  adapterSource.indexOf("function releaseBattlePhaseLocks"),
);
assert.doesNotMatch(releaseBlock, /element\.disabled\s*=/,
  "Battle clear must keep the persistence owner's freshly rendered disabled state instead of restoring the pre-Battle snapshot");
assert.match(adapterSource, /if \(!currentBattle\) \{\s*releaseBattlePhaseLocks\(\);\s*return;\s*\}/,
  "RETURN completion must not strand New Run, Save/Continue, or transient Battle controls in phase-locked disabled state");

console.log("Safari Battle persistence/runtime-replacement central-phase lock smoke passed");