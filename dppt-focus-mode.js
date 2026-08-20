const byId = (id) => document.getElementById(id);
let lastBattleFocus = false;
let returnMarkerTimer = 0;

function runtimeBattle() {
  return globalThis.__maplessSafariRuntime?.variables?.mapless?.battle ?? null;
}

function visible(node) {
  return Boolean(node && !node.hidden && node.getClientRects().length > 0);
}

function firstActionable(root) {
  if (!root) return null;
  return [...root.querySelectorAll('button:not(:disabled),select:not(:disabled),input:not(:disabled)')]
    .find((node) => !node.hidden && node.getClientRects().length > 0) ?? null;
}

function markReturnTarget() {
  window.clearTimeout(returnMarkerTimer);
  document.querySelectorAll('.dppt-return-focus').forEach((node) => node.classList.remove('dppt-return-focus'));
  const village = byId('village-card');
  const board = byId('board-card');
  const target = visible(village) ? firstActionable(village) : visible(board) ? firstActionable(board) : null;
  if (!(target instanceof HTMLElement)) return;
  target.classList.add('dppt-return-focus');
  target.focus({ preventScroll:true });
  returnMarkerTimer = window.setTimeout(() => target.classList.remove('dppt-return-focus'), 1100);
}

function syncFocusMode() {
  const battleCard = byId('battle-card');
  const battleFocus = Boolean(runtimeBattle() && visible(battleCard));
  document.body.classList.toggle('dppt-battle-focus', battleFocus);

  if (battleFocus && !lastBattleFocus) {
    requestAnimationFrame(() => battleCard?.scrollIntoView?.({ block:'start', inline:'nearest', behavior:'auto' }));
  } else if (!battleFocus && lastBattleFocus) {
    requestAnimationFrame(() => requestAnimationFrame(markReturnTarget));
  }
  lastBattleFocus = battleFocus;
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
window.addEventListener('safari-game-menu-opened', schedule, { passive:true });
window.addEventListener('safari-game-menu-closed', schedule, { passive:true });
window.addEventListener('pageshow', schedule, { passive:true });

if (typeof MutationObserver === 'function') {
  new MutationObserver(schedule).observe(document.documentElement, {
    subtree:true,
    attributes:true,
    attributeFilter:['hidden'],
  });
}

schedule();
