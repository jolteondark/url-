// Compatibility shim for older imports. Battle phase ownership lives in
// runtime/safari-battle-orchestrator.js and rendering lives in
// battle-phase-ui-adapter.js. This file must not infer busy/completed phases.
let scheduled = false;

function applyOwnerPhaseUi() {
  scheduled = false;
  globalThis.__maplessApplyBattlePhaseUi?.();
}

function scheduleOwnerPhaseUi() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(applyOwnerPhaseUi);
}

window.addEventListener("safari-runtime-changed", scheduleOwnerPhaseUi, { passive: true });
window.addEventListener("safari-battle-presentation-event", scheduleOwnerPhaseUi, { passive: true });
window.addEventListener("pageshow", scheduleOwnerPhaseUi, { passive: true });
scheduleOwnerPhaseUi();
