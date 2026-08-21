const byId = (id) => document.getElementById(id);

function battle() {
  return globalThis.__maplessSafariRuntime?.variables?.mapless?.battle ?? null;
}

function closeGameMenu() {
  window.dispatchEvent(new CustomEvent("safari-game-menu-close-requested", { detail: { source: "battle-dppt-menu-flow" } }));
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
  if (title) title.textContent = tab === "party" ? "ポケモン" : tab === "bag" ? "どうぐ" : "メニュー";
  const close = byId("game-menu-close");
  if (close) {
    close.textContent = "もどる";
    close.setAttribute("aria-label", "戦闘へ戻る");
  }
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
window.addEventListener("safari-runtime-changed", () => {
  const current = battle();
  if (!current || current.phase !== "COMMAND") {
    if (menu && !menu.hidden && menu.dataset.battleCommandMenu) closeGameMenu();
  }
});
