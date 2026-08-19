const byId = (id) => document.getElementById(id);

let lastVillageVisible = false;
let lastShopVisible = false;
let lastBountyDepartVisible = false;
let pending = false;
let villageTransitionPending = null;

function state() {
  return globalThis.__maplessSafariRuntime?.variables?.mapless ?? null;
}

function visible(node) {
  return Boolean(node && !node.hidden && node.getClientRects().length > 0);
}

function enabled(node) {
  return visible(node) && !node.disabled;
}

function focus(node, { scroll = false, block = "center" } = {}) {
  if (!(node instanceof HTMLElement) || !enabled(node)) return false;
  if (scroll) node.scrollIntoView?.({ behavior: "smooth", block, inline: "nearest" });
  requestAnimationFrame(() => node.focus({ preventScroll: true }));
  return true;
}

function firstBoardAction() {
  const board = byId("board-card");
  if (!visible(board)) return null;
  return [...board.querySelectorAll(".board-cell:not(:disabled):not(.consumed)")]
    .find((node) => visible(node))
    ?? (enabled(byId("enter-village")) ? byId("enter-village") : null);
}

function focusVillagePrimary() {
  const village = byId("village-card");
  if (!visible(village)) return false;

  const depart = byId("bounty-depart");
  if (enabled(depart)) return focus(depart, { scroll: true });

  const accept = byId("bounty-accept");
  if (enabled(accept)) return focus(accept, { scroll: true });

  const shopSelect = byId("village-shop-select");
  if (enabled(shopSelect)) return focus(shopSelect, { scroll: true });

  const leave = byId("leave-village");
  return focus(leave, { scroll: true });
}

function focusShopPrimary() {
  const shop = byId("shop-card");
  if (!visible(shop)) return false;
  return focus(byId("shop-item"), { scroll: true })
    || focus(byId("shop-confirm"), { scroll: true })
    || focus(byId("shop-cancel"), { scroll: true });
}

function armVillageTransition(kind, button, event) {
  if (villageTransitionPending) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return false;
  }
  villageTransitionPending = kind;
  if (button instanceof HTMLButtonElement) {
    if (document.activeElement === button) button.blur();
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
  }
  return true;
}

function settleVillageTransition(current) {
  if (!villageTransitionPending) return;
  const entering = villageTransitionPending === "enter";
  const button = byId(entering ? "enter-village" : "leave-village");
  const completed = entering
    ? current?.location === "village"
    : current?.location === "day_board";
  const failedAndReenabled = button instanceof HTMLButtonElement && !button.disabled;
  if (!completed && !failedAndReenabled) return;
  if (button instanceof HTMLButtonElement) button.removeAttribute("aria-busy");
  villageTransitionPending = null;
}

function sync() {
  const current = state();
  settleVillageTransition(current);

  const villageVisible = visible(byId("village-card"));
  const shopVisible = visible(byId("shop-card"));
  const bountyDepartVisible = enabled(byId("bounty-depart"));

  if (shopVisible && !lastShopVisible) {
    focusShopPrimary();
  } else if (!shopVisible && lastShopVisible) {
    if (villageVisible) focusVillagePrimary();
    else {
      const next = firstBoardAction();
      if (next) focus(next, { scroll: true, block: "start" });
    }
  }

  if (villageVisible && !lastVillageVisible && !shopVisible) {
    focusVillagePrimary();
  }

  // Accepting a bounty replaces the accept button with depart. Make the next tap obvious.
  if (villageVisible && bountyDepartVisible && !lastBountyDepartVisible && !shopVisible) {
    focus(byId("bounty-depart"), { scroll: true });
  }

  // If no village action remains, don't strand focus on a now-disabled control.
  if (villageVisible && !shopVisible) {
    const actions = byId("village-actions")?.textContent ?? "";
    if (/行動\s*0\s*\//.test(actions)) focus(byId("leave-village"), { scroll: true });
  }

  lastVillageVisible = villageVisible;
  lastShopVisible = shopVisible;
  lastBountyDepartVisible = bountyDepartVisible;
}

function schedule() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    sync();
  });
}

// Village entry/exit are async owner transitions. Lock the initiating control synchronously so a portrait-Safari double tap cannot submit the same transition twice.
byId("enter-village")?.addEventListener("click", (event) => {
  armVillageTransition("enter", event.currentTarget, event);
}, true);

byId("leave-village")?.addEventListener("click", (event) => {
  if (!armVillageTransition("leave", event.currentTarget, event)) return;
  window.setTimeout(() => {
    const next = firstBoardAction();
    if (next) focus(next, { scroll: true, block: "start" });
  }, 0);
}, true);

// Keep purchase flow inside the shop when it remains open; otherwise scene-change sync handles return.
byId("shop-confirm")?.addEventListener("click", () => {
  window.setTimeout(() => {
    if (visible(byId("shop-card"))) focusShopPrimary();
  }, 0);
});

window.addEventListener("safari-runtime-changed", schedule, { passive: true });
window.addEventListener("safari-preview-start", schedule, { passive: true });
window.addEventListener("pageshow", schedule, { passive: true });
if (typeof MutationObserver === "function") {
  new MutationObserver(schedule).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["hidden", "disabled"],
  });
}
schedule();
