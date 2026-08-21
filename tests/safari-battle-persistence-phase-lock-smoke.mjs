import assert from "node:assert/strict";
import fs from "node:fs";

const adapterSource = fs.readFileSync(
  new URL("../battle-phase-ui-adapter.js", import.meta.url),
  "utf8",
);

assert.match(adapterSource, /const persistenceAllowed = commandAllowed \|\| resultReady/,
  "manual Save/Continue must be available only at stable COMMAND or RESULT Battle checkpoints");
assert.match(adapterSource, /function pendingBattleReturnCommit\(\)/,
  "central phase UI must recognize the owner pending RETURN checkpoint after the Battle object is cleared");
assert.match(adapterSource, /pending_battle_return_checkpoint\?\.committed === false/,
  "the uncommitted central RETURN checkpoint must remain the readiness truth through persistence completion");
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
assert.match(adapterSource, /pendingBattleReturnCommit\(\) && target\.closest\("#new-run,#save-run,#continue-run"\)/,
  "capture-phase click guard must reject runtime replacement and manual persistence while RETURN save is pending after Battle clear");
assert.match(adapterSource, /function releaseOwnerAwarePhaseLock\(element\)/,
  "Battle clear must have a distinct phase-lock release path");
assert.match(adapterSource, /function releaseBattlePersistenceLocks\(\)/,
  "central phase UI must release persistence locks only after RETURN persistence has completed");
assert.match(adapterSource, /function releaseBattleCommandLocks\(\)/,
  "central phase UI must release transient Bag/replacement locks once the Battle object clears");
assert.match(adapterSource, /if \(!currentBattle\) \{\s*releaseBattleCommandLocks\(\);\s*if \(pendingBattleReturnCommit\(\)\) \{[\s\S]*?setOwnerAwarePhaseInteractive\(byId\(id\), false\);[\s\S]*?\} else \{\s*releaseBattlePersistenceLocks\(\);\s*\}\s*return;\s*\}/,
  "Battle clear must keep New Run/Save/Continue locked through the pending RETURN commit, then release only after commit completion");
const releaseBlock = adapterSource.slice(
  adapterSource.indexOf("function releaseOwnerAwarePhaseLock"),
  adapterSource.indexOf("function releaseBattleCommandLocks"),
);
assert.doesNotMatch(releaseBlock, /element\.disabled\s*=/,
  "Battle clear must keep the persistence owner's freshly rendered disabled state instead of restoring the pre-Battle snapshot");

console.log("Safari Battle persistence/runtime-replacement central-phase lock smoke passed");