const byId = (id) => document.getElementById(id);

function battle() {
  return globalThis.__maplessSafariRuntime?.variables?.mapless?.battle ?? null;
}

function inBattleCommand() {
  return battle()?.phase === "COMMAND";
}

function closeGameMenu() {
  byId("game-menu-close")?.click();
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
  byId("battle-menu-ball-use")?.remove();
  if (tab !== "bag") return;
  const current = battle();
  const pane = byId("menu-bag-pane");
  const capture = byId("capture");
  if (!current || current.phase !== "COMMAND" || current.kind !== "wild" || !pane || !capture) return;

  const button = document.createElement("button");
  button.id = "battle-menu-ball-use";
  button.type = "button";
  button.className = "battle-menu-ball-use";
  button.textContent = "モンスターボールを使う";
  button.addEventListener("click", () => {
    if (!inBattleCommand()) return;
    button.disabled = true;
    closeGameMenu();
    requestAnimationFrame(() => capture.click());
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

// DPt flow: バッグ from the root should open the Bag itself, not another intermediate submenu.
document.addEventListener("click", (event) => {
  const bagCommand = event.target?.closest?.('[data-dppt-command="bag"]');
  if (!bagCommand || !inBattleCommand()) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  byId("menu-bag")?.click();
}, true);

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

const menu = byId("game-menu");
if (menu && typeof MutationObserver === "function") {
  new MutationObserver(() => {
    if (menu.hidden) {
      restoreNormalMenu();
      if (battle()?.phase === "COMMAND") {
        const card = byId("battle-card");
        if (card) card.dataset.dpptMenu = "root";
        const message = byId("battle-message");
        if (message && message.dataset.presentationOwner !== "event") message.textContent = "どうする？";
        requestAnimationFrame(() => {
          byId("battle-card")?.scrollIntoView?.({ behavior: "smooth", block: "end" });
          const fight = document.querySelector('#dppt-command-root button[data-dppt-command="fight"]:not(:disabled)');
          if (fight instanceof HTMLElement) fight.focus({ preventScroll: true });
        });
      }
    }
  }).observe(menu, { attributes: true, attributeFilter: ["hidden"] });
}

window.addEventListener("safari-runtime-changed", () => {
  const current = battle();
  if (!current || current.phase !== "COMMAND") {
    if (menu && !menu.hidden && menu.dataset.battleCommandMenu) closeGameMenu();
  }
});
