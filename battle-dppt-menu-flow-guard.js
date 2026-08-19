const byId = (id) => document.getElementById(id);

function battle() {
  return globalThis.__maplessSafariRuntime?.variables?.mapless?.battle ?? null;
}

function inBattleCommand() {
  const current = battle();
  return Boolean(current && current.phase === "COMMAND" && !current.completed && !current.player_replacement_required);
}

function closeGameMenu() {
  byId("game-menu-close")?.click();
}

function restoreNormalMenu() {
  const menu = byId("game-menu");
  if (!menu) return;
  delete menu.dataset.battleCommandMenu;
  for (const button of menu.querySelectorAll("[data-menu-tab]")) button.hidden = false;
  const close = byId("game-menu-close");
  if (close) close.setAttribute("aria-label", "メニューを閉じる");
  byId("battle-menu-ball-use")?.remove();
}

function injectBattleBall(tab) {
  byId("battle-menu-ball-use")?.remove();
  if (tab !== "bag") return;
  const current = battle();
  const pane = byId("menu-bag-pane");
  const capture = byId("capture");
  if (!current || current.kind !== "wild" || !pane || !capture || capture.disabled) return;

  const button = document.createElement("button");
  button.id = "battle-menu-ball-use";
  button.type = "button";
  button.className = "battle-menu-ball-use";
  button.textContent = "モンスターボールを使う";
  button.addEventListener("click", () => {
    if (!inBattleCommand() || capture.disabled) return;
    closeGameMenu();
    requestAnimationFrame(() => capture.click());
  });
  pane.prepend(button);
}

function lockMenuToBattlePurpose(tab) {
  const menu = byId("game-menu");
  if (!menu || !battle()) return;
  menu.dataset.battleCommandMenu = tab;
  for (const button of menu.querySelectorAll("[data-menu-tab]")) {
    button.hidden = button.dataset.menuTab !== tab;
  }
  for (const pane of menu.querySelectorAll("[data-menu-pane]")) {
    pane.hidden = pane.dataset.menuPane !== tab;
  }
  const title = byId("game-menu-title");
  if (title) title.textContent = tab === "party" ? "ポケモン" : tab === "bag" ? "バッグ" : "メニュー";
  const close = byId("game-menu-close");
  if (close) close.setAttribute("aria-label", "戦闘へ戻る");
  injectBattleBall(tab);
  requestAnimationFrame(() => {
    const first = menu.querySelector(`[data-menu-pane="${tab}"] button:not(:disabled), [data-menu-pane="${tab}"] select:not(:disabled)`);
    if (first instanceof HTMLElement) first.focus({ preventScroll: true });
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
  if (!battle()) return;
  const tab = event.detail?.tab;
  if (tab === "party" || tab === "bag") lockMenuToBattlePurpose(tab);
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
        requestAnimationFrame(() => byId("battle-card")?.scrollIntoView?.({ behavior: "smooth", block: "end" }));
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
