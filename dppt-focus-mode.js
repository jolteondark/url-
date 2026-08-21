const byId = (id) => document.getElementById(id);

function runtimeBattle() {
  return globalThis.__maplessSafariRuntime?.variables?.mapless?.battle ?? null;
}

function visible(node) {
  return Boolean(node && !node.hidden && node.getClientRects().length > 0);
}

function syncFocusMode() {
  const battleCard = byId('battle-card');
  const battleFocus = Boolean(runtimeBattle() && visible(battleCard));
  document.body.classList.toggle('dppt-battle-focus', battleFocus);
}

let pending = false;
function schedule() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    syncFocusMode();
  });
}

window.addEventListener('safari-runtime-changed', schedule, { passive:true });
window.addEventListener('safari-preview-start', schedule, { passive:true });
window.addEventListener('pageshow', schedule, { passive:true });

schedule();
