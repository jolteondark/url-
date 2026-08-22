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
assert.match(adapterSource, /const RETURN_MUTATION_MENU_IDS = \["menu-party", "menu-bag", "menu-box"\]/,
  "Party/Bag/Box mutation surfaces must be named central RETURN-lock targets");
assert.match(adapterSource, /setOwnerAwarePhaseInteractive\(byId\("new-run"\), false\)/,
  "New Run must remain unavailable while any Battle phase is active so it cannot replace the orchestrated runtime");
assert.match(adapterSource, /for \(const id of \["save-run", "continue-run"\]\)/,
  "central phase UI must own transient Battle locking for Save and Continue");
assert.match(adapterSource, /setOwnerAwarePhaseInteractive\(byId\(id\), persistenceAllowed\)/,
  "phase locking must preserve the persistence owner's pre-existing disabled state while Battle is active");
assert.match(adapterSource, /function setPendingReturnMenuLocked\(locked\)/,
  "central RETURN UI must own locking of Party/Bag/Box mutation surfaces after Battle clear");
assert.match(adapterSource, /function setPendingReturnMenuLocked\(locked\) \{[\s\S]*?setOwnerAwarePhaseInteractive\(byId\(id\), !locked\);[\s\S]*?\}/,
  "pending RETURN Party/Bag/Box lock must preserve each menu owner's pre-existing disabled state instead of blind enabling on release");
assert.doesNotMatch(
  adapterSource.slice(
    adapterSource.indexOf("function setPendingReturnMenuLocked"),
    adapterSource.indexOf("function setPendingReturnDayBoardLocked"),
  ),
  /setInteractive\(/,
  "pending RETURN Party/Bag/Box lock must not bypass owner-aware disabled-state preservation");
assert.match(adapterSource, /function setPendingReturnDayBoardLocked\(locked\)/,
  "central RETURN UI must also own the Day Board mutation surface after Battle clear");
assert.match(adapterSource, /if \(board\) board\.inert = locked/,
  "pending RETURN must make the Day Board itself non-interactive until the save checkpoint commits");
assert.match(adapterSource, /setOwnerAwarePhaseInteractive\(byId\("enter-village"\), !locked\)/,
  "pending RETURN must block village entry without losing the Day Board owner's pre-existing disabled state");
assert.match(adapterSource, /target\.closest\("#new-run"\)\) return false/,
  "capture-phase click guard must reject New Run throughout an active Battle");
assert.match(adapterSource, /target\.closest\("#save-run,#continue-run"\)\) return phase === COMMAND_PHASE \|\| phase === RESULT_PHASE/,
  "capture-phase click guard must reject Save/Continue during ACTION/CHECK/replacement/growth/RETURN");
assert.match(adapterSource, /pendingBattleReturnCommit\(\) && target\.closest\("#new-run,#save-run,#continue-run,#menu-party,#menu-bag,#menu-box,#board button\[data-board-index\],#enter-village"\)/,
  "capture-phase click guard must reject runtime replacement, persistence, menus, Day Board cells, and village entry while RETURN save is pending after Battle clear");
assert.match(adapterSource, /function releaseOwnerAwarePhaseLock\(element\)/,
  "Battle clear must have a distinct phase-lock release path");
assert.match(adapterSource, /function releaseBattlePersistenceLocks\(\)/,
  "central phase UI must release persistence locks only after RETURN persistence has completed");
assert.match(adapterSource, /function releaseBattleCommandLocks\(\)/,
  "central phase UI must release transient Bag/replacement locks once the Battle object clears");
assert.match(adapterSource, /if \(!currentBattle\) \{\s*releaseBattleCommandLocks\(\);\s*const returnCommitPending = pendingBattleReturnCommit\(\);\s*setPendingReturnMenuLocked\(returnCommitPending\);\s*setPendingReturnDayBoardLocked\(returnCommitPending\);\s*if \(returnCommitPending\) \{[\s\S]*?setOwnerAwarePhaseInteractive\(byId\(id\), false\);[\s\S]*?\} else \{\s*releaseBattlePersistenceLocks\(\);\s*\}\s*return;\s*\}/,
  "Battle clear must keep persistence, menu, and Day Board mutation surfaces locked through pending RETURN, then release only after commit completion");
const releaseBlock = adapterSource.slice(
  adapterSource.indexOf("function releaseOwnerAwarePhaseLock"),
  adapterSource.indexOf("function releaseBattleCommandLocks"),
);
assert.doesNotMatch(releaseBlock, /element\.disabled\s*=/,
  "Battle clear must keep the persistence owner's freshly rendered disabled state instead of restoring the pre-Battle snapshot");

console.log("Safari Battle persistence/runtime-replacement central-phase lock smoke passed");
