const byId = (id) => document.getElementById(id);

function battle() {
  return globalThis.__maplessSafariRuntime?.variables?.mapless?.battle ?? null;
}

function inBattleCommand() {
  return battle()?.phase === "COMMAND";
}

function closeGameMenu() {
  window.dispatchEvent(new CustomEvent("safari-game-menu-close-requested", { detail: { source: "battle-dppt-menu-flow" } }));
}

function requestBattleCapture(sourceButton) {
  window.dispatchEvent(new CustomEvent("safari-battle-capture-requested", { detail: { sourceButton } }));
}

function restoreNormalMenu() {
  const menu = byId("game-menu");
  if (!menu) return;
  delete menu.dataset.battleCommandMenu;
  const tabs = menu.querySelector(".game-menu-tabs");
  if (tabs) tabs.hidden = false;
  for (const button of menu.querySelectorAll("[data-menu-tab]")) button.hidden = false;
  const close = byId("game-menu-close");
  if (close) {
    close.textContent = "×";
    close.setAttribute("aria-label", "メニューを閉じる");
  }
  byId("battle-menu-ball-use")?.remove();
}

function injectBattleBall(tab) {
  if (tab !== "bag") {
    byId("battle-menu-ball-use")?.remove();
    return;
  }
  const current = battle();
  const pane = byId("menu-bag-pane");
  if (!current || current.phase !== "COMMAND" || current.kind !== "wild" || !pane) {
    byId("battle-menu-ball-use")?.remove();
    return;
  }
  if (byId("battle-menu-ball-use")) return;

  const button = document.createElement("button");
  button.id = "battle-menu-ball-use";
  button.type = "button";
  button.className = "battle-menu-ball-use";
  button.textContent = "モンスターボールを使う";
  button.addEventListener("click", () => {
    if (!inBattleCommand()) return;
    button.disabled = true;
    closeGameMenu();
    requestBattleCapture(button);
  });
  pane.prepend(button);
}

function lockMenuToBattlePurpose(tab) {
  const menu = byId("game-menu");
  if (!menu || !battle()) return;
  menu.dataset.battleCommandMenu = tab;
  const tabs = menu.querySelector(".game-menu-tabs");
  if (tabs) tabs.hidden = true;
  for (const pane of menu.querySelectorAll("[data-menu-pane]")) {
    pane.hidden = pane.dataset.menuPane !== tab;
  }
  const title = byId("game-menu-title");
  if (title) title.textContent = tab === "party" ? "ポケモン" : tab === "bag" ? "バッグ" : "メニュー";
  const close = byId("game-menu-close");
  if (close) {
    close.textContent = "もどる";
    close.setAttribute("aria-label", "戦闘へ戻る");
  }
  injectBattleBall(tab);
  requestAnimationFrame(() => {
    const first = menu.querySelector(`[data-menu-pane="${tab}"] button:not(:disabled), [data-menu-pane="${tab}"] select:not(:disabled)`);
    const fallback = byId("game-menu-close");
    const target = first instanceof HTMLElement ? first : fallback;
    if (target instanceof HTMLElement) target.focus({ preventScroll: true });
  });
}

window.addEventListener("safari-game-menu-opened", (event) => {
  const current = battle();
  if (!current) return;
  const tab = event.detail?.tab;
  if (current.phase !== "COMMAND" || (tab !== "party" && tab !== "bag")) {
    closeGameMenu();
    return;
  }
  lockMenuToBattlePurpose(tab);
});

window.addEventListener("safari-game-menu-closed", restoreNormalMenu);

const menu = byId("game-menu");
const bagPane = byId("menu-bag-pane");
if (bagPane && typeof MutationObserver === "function") {
  let reinjectQueued = false;
  new MutationObserver(() => {
    if (reinjectQueued) return;
    if (menu?.hidden || menu?.dataset.battleCommandMenu !== "bag" || !inBattleCommand()) return;
    reinjectQueued = true;
    requestAnimationFrame(() => {
      reinjectQueued = false;
      injectBattleBall("bag");
    });
  }).observe(bagPane, { childList: true, subtree: false });
}

window.addEventListener("safari-runtime-changed", () => {
  const current = battle();
  if (!current || current.phase !== "COMMAND") {
    if (menu && !menu.hidden && menu.dataset.battleCommandMenu) closeGameMenu();
    return;
  }
  if (menu && !menu.hidden && menu.dataset.battleCommandMenu === "bag") injectBattleBall("bag");
});
