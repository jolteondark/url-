import { saveSafariPlayableRun } from "./runtime/safari-playable-integration.js";
import { useSafariBagItemOnPartyPokemon } from "./runtime/safari-bag-item-use.js";
import "./battle-menu-presentation.js";

const byId = (id) => document.getElementById(id);
const moneyFormat = new Intl.NumberFormat("ja-JP");
let active = "party";

function snapshot() {
  // The preview app owns the live runtime. Never create/load a second runtime
  // from this presentation bridge; that used to replace the shared global with
  // a fresh fallback whenever the Bag menu rendered.
  return globalThis.__maplessSafariRuntime ?? null;
}

function bagSlots(runtime) {
  const slots = Array.isArray(runtime?.bag?.slots) ? runtime.bag.slots : [];
  const totals = new Map();
  for (const slot of slots) {
    if (!slot) continue;
    const id = Array.isArray(slot) ? slot[0] : slot.id;
    const qty = Number(Array.isArray(slot) ? slot[1] : slot.quantity ?? 0);
    if (!id || qty <= 0) continue;
    totals.set(id, (totals.get(id) ?? 0) + qty);
  }
  return [...totals].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
}

function potionTargetSelect(runtime) {
  const select = document.createElement("select");
  select.className = "bag-target-select";
  select.setAttribute("aria-label", "キズぐすりを使うポケモン");
  let firstUsable = null;
  for (const [index, pokemon] of (runtime?.player?.party ?? []).entries()) {
    if (!pokemon) continue;
    const hp = Number(pokemon.hp ?? 0);
    const maxHp = Number(pokemon.max_hp ?? hp);
    const usable = Number(pokemon.steps_to_hatch ?? 0) <= 0 && hp > 0 && hp < maxHp;
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${pokemon.nickname ?? pokemon.species}  HP ${hp}/${maxHp}`;
    option.disabled = !usable;
    if (usable && firstUsable == null) firstUsable = index;
    select.append(option);
  }
  if (firstUsable != null) select.value = String(firstUsable);
  select.disabled = firstUsable == null;
  return { select, hasTarget: firstUsable != null };
}

function renderBag() {
  const pane = byId("menu-bag-pane");
  if (!pane) return;
  const runtime = snapshot();
  const wrap = document.createElement("section");
  wrap.className = "card bag-menu-card";
  const head = document.createElement("div");
  head.className = "section-heading";
  head.innerHTML = '<h2>Bag</h2><span class="pill">INVENTORY</span>';
  wrap.append(head);

  if (!runtime) {
    const empty = document.createElement("div");
    empty.className = "bag-empty";
    empty.textContent = "ランを開始するとバッグを使用できます";
    wrap.append(empty);
    pane.replaceChildren(wrap);
    return;
  }

  const money = document.createElement("div");
  money.className = "bag-money";
  const moneyLabel = document.createElement("span");
  moneyLabel.textContent = "所持金";
  const moneyValue = document.createElement("strong");
  moneyValue.textContent = moneyFormat.format(Number(runtime.bag?.money ?? 0)) + "円";
  money.append(moneyLabel, moneyValue);

  const grid = document.createElement("div");
  grid.className = "bag-grid";
  const rows = bagSlots(runtime);
  if (rows.length) {
    for (const [id, qty] of rows) {
      const row = document.createElement("article");
      row.className = "bag-slot";
      const name = document.createElement("strong");
      name.textContent = id === "POTION" ? "キズぐすり" : id;
      const amount = document.createElement("span");
      amount.textContent = "×" + qty;
      row.append(name, amount);

      if (id === "POTION") {
        const { select, hasTarget } = potionTargetSelect(runtime);
        const use = document.createElement("button");
        use.type = "button";
        use.dataset.bagUseItem = id;
        use.textContent = "使う";
        use.disabled = !hasTarget || Boolean(runtime.variables?.mapless?.battle) || Boolean(runtime.variables?.mapless?.shop);
        row.append(select, use);
      }
      grid.append(row);
    }
  } else {
    const empty = document.createElement("div");
    empty.className = "bag-empty";
    empty.textContent = "バッグは空です";
    grid.append(empty);
  }
  wrap.append(money, grid);
  pane.replaceChildren(wrap);
}

function adoptPanels() {
  const party = byId("party-detail-card");
  const box = byId("storage-detail-card");
  const partyPane = byId("menu-party-pane");
  const boxPane = byId("menu-box-pane");
  if (party && partyPane && party.parentElement !== partyPane) partyPane.append(party);
  if (box && boxPane && box.parentElement !== boxPane) boxPane.append(box);
}

function show(tab) {
  active = tab;
  adoptPanels();
  const menu = byId("game-menu");
  if (!menu) return;
  menu.hidden = false;
  document.body.classList.add("menu-open");
  for (const pane of menu.querySelectorAll("[data-menu-pane]")) pane.hidden = pane.dataset.menuPane !== tab;
  for (const button of menu.querySelectorAll("[data-menu-tab]")) button.classList.toggle("active", button.dataset.menuTab === tab);
  byId("game-menu-title").textContent = tab === "party" ? "Party" : tab === "bag" ? "Bag" : "Box";
  if (tab === "bag") renderBag();
  window.dispatchEvent(new CustomEvent("safari-game-menu-opened", { detail: { tab } }));
}

function close() {
  const menu = byId("game-menu");
  if (menu) menu.hidden = true;
  document.body.classList.remove("menu-open");
}

new MutationObserver(adoptPanels).observe(document.body, { childList: true, subtree: true });
adoptPanels();

byId("menu-party")?.addEventListener("click", () => show("party"));
byId("menu-bag")?.addEventListener("click", () => show("bag"));
byId("menu-box")?.addEventListener("click", () => show("box"));
byId("game-menu-close")?.addEventListener("click", close);
byId("game-menu")?.addEventListener("click", (event) => {
  const tab = event.target.closest("button[data-menu-tab]");
  if (tab) {
    show(tab.dataset.menuTab);
    return;
  }
  const use = event.target.closest("button[data-bag-use-item]");
  if (use) {
    const runtime = snapshot();
    const row = use.closest(".bag-slot");
    const partyIndex = Number(row?.querySelector(".bag-target-select")?.value);
    const result = runtime
      ? useSafariBagItemOnPartyPokemon(runtime, { itemId: use.dataset.bagUseItem, partyIndex })
      : { result: "runtime_missing", persistenceRequested: false };
    if (result.persistenceRequested) saveSafariPlayableRun(window.localStorage, runtime);
    window.dispatchEvent(new CustomEvent("safari-runtime-changed"));
    renderBag();
    return;
  }
  if (event.target === byId("game-menu")) close();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !byId("game-menu")?.hidden) close();
});
window.addEventListener("storage", () => {
  if (active === "bag" && !byId("game-menu")?.hidden) renderBag();
});
window.addEventListener("safari-runtime-changed", () => {
  if (active === "bag" && !byId("game-menu")?.hidden) renderBag();
  adoptPanels();
});
