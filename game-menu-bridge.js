import { SAFARI_MOVE_PRESENTATION, saveSafariPlayableRun, useSafariBattleItem } from "./runtime/safari-web-playable-integration.js";
import {
  captureSafariBattlePresentationAckSequence,
  completeSafariBattlePresentationForSequence,
} from "./runtime/safari-battle-presentation-ack.js";
import {
  canSafariBagItemTargetPartyPokemon,
  canSafariBagItemUseWithoutTarget,
  isSafariBattleNoTargetItem,
  isSafariMoveSelectionItem,
  isSafariPartyUseItem,
  safariBagItemMoveOptions,
  useSafariBagItemOnPartyPokemon,
} from "./runtime/safari-bag-item-use.js";
import {
  canSafariBagUsePartyRevivalItem,
  isSafariPartyRevivalDirectItem,
  useSafariBagPartyRevivalItem,
} from "./runtime/safari-bag-party-revival-use.js";
import { isBattleEscapeItem } from "./runtime/item-battle-escape-effects.js";
import {
  canSafariUseBattleEscapeItem,
  useSafariBattleEscapeItem,
} from "./runtime/safari-battle-escape-item-use.js";
import {
  canSafariUseBattleStatBoostItem,
  isSafariBattleStatBoostItem,
} from "./runtime/safari-battle-stat-boost-item-use.js";
import { formatSafariBattlePresentationEvent } from "./battle-presentation-narration.js";

const byId = (id) => document.getElementById(id);
const moneyFormat = new Intl.NumberFormat("ja-JP");
const sleep = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
let active = "party";
let fieldBagUseBusy = false;

function snapshot() {
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

function bagTargetSelect(runtime, itemId, context) {
  const select = document.createElement("select");
  select.className = "bag-target-select";
  select.setAttribute("aria-label", "アイテムを使うポケモン");
  let firstUsable = null;
  for (const [index, pokemon] of (runtime?.player?.party ?? []).entries()) {
    if (!pokemon) continue;
    const hp = Number(pokemon.hp ?? 0);
    const maxHp = Number(pokemon.max_hp ?? hp);
    const status = pokemon.status && String(pokemon.status).toUpperCase() !== "NONE" ? `  ${pokemon.status}` : "";
    const usable = canSafariBagItemTargetPartyPokemon(runtime, itemId, index, { context });
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${pokemon.nickname ?? pokemon.species}  HP ${hp}/${maxHp}${status}`;
    option.disabled = !usable;
    if (usable && firstUsable == null) firstUsable = index;
    select.append(option);
  }
  if (firstUsable != null) select.value = String(firstUsable);
  select.disabled = firstUsable == null;
  return { select, hasTarget: firstUsable != null };
}

function populateBagMoveSelect(select, runtime, itemId, partyIndex, context) {
  select.replaceChildren();
  let firstUsable = null;
  for (const move of safariBagItemMoveOptions(runtime, itemId, partyIndex, { context })) {
    const option = document.createElement("option");
    option.value = String(move.index);
    option.textContent = move.totalPp == null
      ? String(move.id ?? `Move ${move.index + 1}`)
      : `${move.id}  PP ${move.pp}/${move.totalPp}  PP Up ${move.ppup}/3`;
    option.disabled = !move.usable;
    if (move.usable && firstUsable == null) firstUsable = move.index;
    select.append(option);
  }
  if (firstUsable != null) select.value = String(firstUsable);
  select.disabled = firstUsable == null;
  return firstUsable != null;
}

function bagMoveSelect(runtime, itemId, partyIndex, context) {
  const select = document.createElement("select");
  select.className = "bag-move-select";
  select.setAttribute("aria-label", "アイテムを使うわざ");
  return { select, hasMove: populateBagMoveSelect(select, runtime, itemId, partyIndex, context) };
}

function battleBagCommandAvailable(runtime) {
  const battle = runtime?.variables?.mapless?.battle;
  if (!battle) return true;
  return battle.phase === "COMMAND" && battle.origin !== "boundary_trial";
}

function battlePresentationName(runtime, side) {
  const visible = byId(side + "-name")?.textContent?.trim();
  if (visible) return visible;
  const battle = runtime?.variables?.mapless?.battle;
  if (side === "player") {
    const index = Number(battle?.player_party_index ?? 0);
    return runtime?.player?.party?.[index]?.species ?? runtime?.player?.party?.[0]?.species ?? "味方のポケモン";
  }
  return battle?.foe?.species ?? "相手のポケモン";
}

async function playBattleItemPresentation(runtime, events = []) {
  for (const event of events) {
    const message = formatSafariBattlePresentationEvent(event, {
      actorName: battlePresentationName(runtime, event.actor),
      targetName: battlePresentationName(runtime, event.target),
      moveName: SAFARI_MOVE_PRESENTATION[event.moveId]?.name ?? event.moveId,
      notice: runtime?.variables?.mapless?.notice,
    });
    if (message && byId("battle-message")) byId("battle-message").textContent = message;
    if (event.type === "battle_item") {
      const pokemon = runtime?.player?.party?.[Number(event.partyIndex ?? 0)];
      const maxHp = Number(pokemon?.max_hp ?? 0);
      if (byId("player-hp") && maxHp > 0 && Number.isFinite(Number(event.hpAfter))) byId("player-hp").textContent = `${event.hpAfter} / ${maxHp}`;
      if (byId("player-hp-bar") && maxHp > 0 && Number.isFinite(Number(event.hpAfter))) byId("player-hp-bar").style.width = Math.max(0, Math.min(100, Number(event.hpAfter) / maxHp * 100)) + "%";
      await sleep(260);
    } else if (event.type === "move_started") {
      const actor = byId(event.actor + "-combatant");
      actor?.classList.add("lunge");
      await sleep(180);
      actor?.classList.remove("lunge");
    } else if (event.type === "damage_applied") {
      const target = byId(event.target + "-combatant");
      const hp = byId(event.target + "-hp");
      const bar = byId(event.target + "-hp-bar");
      const maxHp = Number(event.targetMaxHp ?? 0);
      if (hp && maxHp > 0) hp.textContent = `${event.hpAfter} / ${maxHp}`;
      if (bar && maxHp > 0) bar.style.width = Math.max(0, Math.min(100, Number(event.hpAfter) / maxHp * 100)) + "%";
      target?.classList.add("hit");
      await sleep(220);
      target?.classList.remove("hit");
    } else if (event.type === "miss") {
      await sleep(240);
    } else if (event.type === "faint" || event.type === "trainer_next") {
      await sleep(280);
    }
  }
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

      const battleActive = Boolean(runtime.variables?.mapless?.battle);
      const context = battleActive ? "battle" : "field";
      const directPartyRevival = !battleActive && isSafariPartyRevivalDirectItem(id);
      const directBattleEscape = battleActive && isBattleEscapeItem(id);
      const directBattleStatBoost = battleActive && isSafariBattleStatBoostItem(id);
      if (isSafariPartyUseItem(id, context) || directPartyRevival || directBattleEscape || directBattleStatBoost) {
        const noTarget = directPartyRevival || directBattleEscape || directBattleStatBoost || (battleActive && isSafariBattleNoTargetItem(id));
        const target = noTarget ? null : bagTargetSelect(runtime, id, context);
        const use = document.createElement("button");
        use.type = "button";
        use.dataset.bagUseItem = id;
        use.textContent = "使う";

        let move = null;
        if (target && isSafariMoveSelectionItem(id, context)) {
          move = bagMoveSelect(runtime, id, Number(target.select.value), context);
          target.select.addEventListener("change", () => {
            move.hasMove = populateBagMoveSelect(move.select, runtime, id, Number(target.select.value), context);
            refreshDisabled();
          });
        }

        const refreshDisabled = () => {
          const canUse = directPartyRevival
            ? canSafariBagUsePartyRevivalItem(runtime, id, { context })
            : directBattleEscape
              ? canSafariUseBattleEscapeItem(runtime, id)
              : directBattleStatBoost
                ? canSafariUseBattleStatBoostItem(runtime, { itemId: id })
                : noTarget
                  ? canSafariBagItemUseWithoutTarget(runtime, id, { context })
                  : Boolean(target?.hasTarget) && (!move || move.hasMove);
          use.disabled = !canUse || Boolean(runtime.variables?.mapless?.shop) || !battleBagCommandAvailable(runtime) || (!battleActive && fieldBagUseBusy);
        };
        refreshDisabled();
        if (target) row.append(target.select);
        if (move) row.append(move.select);
        row.append(use);
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
  globalThis.__maplessApplyBattlePhaseUi?.();
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
  const wasOpen = Boolean(menu && !menu.hidden);
  const focused = document.activeElement;
  if (wasOpen && focused instanceof HTMLElement && menu.contains(focused)) focused.blur();
  if (menu) menu.hidden = true;
  document.body.classList.remove("menu-open");
  if (wasOpen) window.dispatchEvent(new CustomEvent("safari-game-menu-closed", { detail: { tab: active } }));
}

function closeBattleMenuOutsideCommand() {
  const menu = byId("game-menu");
  if (!menu || menu.hidden) return;
  const battle = snapshot()?.variables?.mapless?.battle;
  if (!battle || battle.phase === "COMMAND") return;
  close();
}

adoptPanels();

byId("menu-party")?.addEventListener("click", () => show("party"));
byId("menu-bag")?.addEventListener("click", () => show("bag"));
byId("menu-box")?.addEventListener("click", () => show("box"));
byId("game-menu-close")?.addEventListener("click", close);
byId("game-menu")?.addEventListener("click", async (event) => {
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
    const moveValue = row?.querySelector(".bag-move-select")?.value;
    const moveIndex = moveValue === undefined || moveValue === "" ? undefined : Number(moveValue);
    if (!runtime || !battleBagCommandAvailable(runtime)) return;
    const battle = runtime.variables?.mapless?.battle;
    if (!battle && fieldBagUseBusy) return;
    if (!battle) {
      fieldBagUseBusy = true;
      renderBag();
    }
    try {
      if (battle) {
        const itemId = use.dataset.bagUseItem;
        const statBoost = isSafariBattleStatBoostItem(itemId);
        const pending = isBattleEscapeItem(itemId)
          ? Promise.resolve(useSafariBattleEscapeItem(runtime, { itemId }))
          : useSafariBattleItem(runtime, {
              itemId,
              partyIndex: statBoost ? undefined : partyIndex,
              moveIndex: statBoost ? undefined : moveIndex,
            });
        globalThis.__maplessApplyBattlePhaseUi?.();
        const result = await pending;
        const presentationSequence = captureSafariBattlePresentationAckSequence(runtime);
        globalThis.__maplessLastBattleItemResult = result;
        if (result.turnConsumed) {
          close();
          await playBattleItemPresentation(runtime, result.presentation ?? []);
          completeSafariBattlePresentationForSequence(runtime, presentationSequence);
        }
      } else {
        const result = isSafariPartyRevivalDirectItem(use.dataset.bagUseItem)
          ? useSafariBagPartyRevivalItem(runtime, { itemId: use.dataset.bagUseItem })
          : useSafariBagItemOnPartyPokemon(runtime, { itemId: use.dataset.bagUseItem, partyIndex, moveIndex });
        if (result.persistenceRequested) saveSafariPlayableRun(window.localStorage, runtime);
      }
    } catch (error) {
      globalThis.__maplessLastError = error;
      console.error("[Mapless] Bag use failed", error);
    } finally {
      if (!battle) fieldBagUseBusy = false;
      window.dispatchEvent(new CustomEvent("safari-runtime-changed"));
      renderBag();
    }
    return;
  }
  if (event.target === byId("game-menu")) close();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !byId("game-menu")?.hidden) close();
});
window.addEventListener("safari-game-menu-ui-ready", adoptPanels);
window.addEventListener("safari-game-menu-open-ready", (event) => {
  const tab = event.detail?.tab;
  if (["party", "bag", "box"].includes(tab)) show(tab);
});
window.addEventListener("safari-game-menu-close-requested", close);
window.addEventListener("storage", () => {
  if (active === "bag" && !byId("game-menu")?.hidden) renderBag();
});
window.addEventListener("safari-runtime-changed", () => {
  closeBattleMenuOutsideCommand();
  if (active === "bag" && !byId("game-menu")?.hidden) renderBag();
  adoptPanels();
});