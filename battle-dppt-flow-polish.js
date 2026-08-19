const byId = (id) => document.getElementById(id);

let lastBattlePresent = false;
let lastPhase = null;
let lastReturnTarget = null;

function state() {
  return globalThis.__maplessSafariRuntime?.variables?.mapless ?? null;
}

function battle() {
  return state()?.battle ?? null;
}

function phaseOf(current = battle()) {
  if (!current) return null;
  return current.phase ?? null;
}

function scrollTo(node, block = "start") {
  if (!node || typeof node.scrollIntoView !== "function") return;
  node.scrollIntoView({ behavior: "smooth", block, inline: "nearest" });
}

function focusVisible(selector, root = document) {
  const node = [...root.querySelectorAll(selector)].find((candidate) => !candidate.hidden && !candidate.disabled && candidate.getClientRects().length > 0);
  if (node instanceof HTMLElement) node.focus({ preventScroll:true });
  return node ?? null;
}

function clearBattleFocus() {
  const card = byId("battle-card");
  const active = document.activeElement;
  if (card && active instanceof HTMLElement && card.contains(active)) active.blur();
}

function closeOverlayIfBattleAdvanced(phase) {
  const menu = byId("game-menu");
  if (!menu || menu.hidden || phase === "COMMAND" || phase === "REPLACEMENT") return;
  byId("game-menu-close")?.click();
}

function contextualizeReturn(current) {
  const button = byId("return-board");
  if (!button || phaseOf(current) !== "RESULT") return;
  const target = current?.return_target ?? "day_board";
  button.textContent = target === "home" ? "ラン結果へ" : "Day Boardへ戻る";
  button.setAttribute("aria-label", button.textContent);
}

function focusBoardNextAction() {
  const board = byId("board-card");
  if (!board || board.hidden) return;
  focusVisible(".board-cell:not(:disabled):not(.consumed)", board)
    ?? focusVisible("#enter-village:not(:disabled)", board);
}

function syncFlow() {
  const current = battle();
  const phase = phaseOf(current);
  const battlePresent = Boolean(current && !byId("battle-card")?.hidden);

  if (battlePresent && !lastBattlePresent) {
    requestAnimationFrame(() => scrollTo(byId("battle-card"), "start"));
  }

  closeOverlayIfBattleAdvanced(phase);
  contextualizeReturn(current);

  if (battlePresent && phase === "COMMAND" && lastPhase !== "COMMAND") {
    const card = byId("battle-card");
    if (card) card.dataset.dpptMenu = "root";
    const message = byId("battle-message");
    if (message && message.dataset.presentationOwner !== "event") message.textContent = "どうする？";
    requestAnimationFrame(() => focusVisible('[data-dppt-command="fight"]:not(:disabled)', card ?? document));
  }

  if (battlePresent && phase === "REPLACEMENT" && lastPhase !== "REPLACEMENT") {
    requestAnimationFrame(() => scrollTo(byId("player-replacement-panel") ?? byId("battle-card")?.querySelector(".battle-command-panel"), "center"));
  }

  if (battlePresent && phase === "RESULT" && lastPhase !== "RESULT") {
    requestAnimationFrame(() => {
      scrollTo(byId("battle-card")?.querySelector(".battle-command-panel"), "end");
      focusVisible("#return-board:not(:disabled)", byId("battle-card") ?? document);
    });
  }

  const target = current?.return_target ?? null;
  if (!battlePresent && lastBattlePresent) {
    clearBattleFocus();
    requestAnimationFrame(() => {
      const stateNow = state();
      if (lastReturnTarget === "home" || stateNow?.location === "home") {
        scrollTo(document.querySelector(".app"), "start");
      } else {
        scrollTo(byId("board-card"), "start");
        requestAnimationFrame(() => {
          clearBattleFocus();
          focusBoardNextAction();
        });
      }
    });
  }

  lastBattlePresent = battlePresent;
  lastPhase = phase;
  lastReturnTarget = target ?? lastReturnTarget;
}

let pending = false;
function schedule() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    syncFlow();
  });
}

window.addEventListener("safari-runtime-changed", schedule, { passive:true });
window.addEventListener("safari-preview-start", schedule, { passive:true });
window.addEventListener("safari-game-menu-opened", schedule, { passive:true });
window.addEventListener("mapless-dppt-menu-changed", schedule, { passive:true });
window.addEventListener("pageshow", schedule, { passive:true });
if (typeof MutationObserver === "function") {
  new MutationObserver(schedule).observe(document.documentElement, {
    subtree:true,
    childList:true,
    attributes:true,
    attributeFilter:["hidden","disabled","data-dppt-menu"],
  });
}
schedule();
