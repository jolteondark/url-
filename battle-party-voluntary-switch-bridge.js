import {
  SAFARI_MOVE_PRESENTATION,
  saveSafariPlayableRun,
} from "./runtime/safari-web-playable-integration.js";
import { switchSafariNormalBattlePlayer } from "./runtime/safari-normal-battle-voluntary-switch.js";
import { formatSafariBattlePresentationEvent } from "./battle-presentation-narration.js";

const byId = (id) => document.getElementById(id);
const sleep = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
let selecting = false;
let syncQueued = false;

function runtime() {
  return globalThis.__maplessSafariRuntime ?? null;
}

function battle() {
  return runtime()?.variables?.mapless?.battle ?? null;
}

function selectableBattle(current = battle()) {
  return Boolean(
    current
    && current.phase === "COMMAND"
    && !current.completed
    && current.origin !== "boundary_trial"
    && !current.player_replacement_required
  );
}

function partyPokemon(index) {
  return runtime()?.player?.party?.[Number(index)] ?? null;
}

function battleMenuOpen() {
  const menu = byId("game-menu");
  return Boolean(menu && !menu.hidden && menu.dataset.battleCommandMenu === "party");
}

function statusText(pokemon) {
  if (!pokemon) return "選べません";
  if (Number(pokemon.hp ?? 0) <= 0) return "ひんし";
  return "交代する";
}

function makeSwitchButton(index, pokemon, disabled = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "party-lead-button";
  button.dataset.battleSwitchPartyIndex = String(index);
  button.textContent = selecting ? "交代中…" : statusText(pokemon);
  button.disabled = disabled || selecting || Number(pokemon?.hp ?? 0) <= 0;
  return button;
}

function makeActiveBadge() {
  const badge = document.createElement("span");
  badge.className = "party-lead-badge";
  badge.textContent = "戦闘中";
  return badge;
}

function syncControls() {
  syncQueued = false;
  if (!battleMenuOpen()) return;
  const current = battle();
  if (!selectableBattle(current)) return;
  const activeIndex = Number(current.player_party_index ?? 0);
  const slots = [...document.querySelectorAll("#menu-party-pane .party-slot:not(.empty)")];
  slots.forEach((slot, index) => {
    const row = slot.querySelector(".party-lead-row");
    if (!row) return;
    const marker = `${activeIndex}:${selecting ? 1 : 0}:${Number(partyPokemon(index)?.hp ?? 0)}`;
    if (row.dataset.battleSwitchState === marker) return;
    row.dataset.battleSwitchState = marker;
    row.replaceChildren(index === activeIndex
      ? makeActiveBadge()
      : makeSwitchButton(index, partyPokemon(index)));
  });
}

function queueSync() {
  if (syncQueued) return;
  syncQueued = true;
  requestAnimationFrame(syncControls);
}

function presentationName(currentRuntime, currentBattle, side, event = {}) {
  const ownerSnapshot = side === event.actor
    ? event.actorSpecies
    : side === event.target ? event.targetSpecies : null;
  if (ownerSnapshot) return ownerSnapshot;
  if (side === "player") {
    const index = Number(currentBattle?.player_party_index ?? 0);
    return currentRuntime?.player?.party?.[index]?.species ?? "味方のポケモン";
  }
  return currentBattle?.foe?.species ?? "相手のポケモン";
}

async function playPresentation(currentRuntime, events = []) {
  for (const event of events) {
    const currentBattle = currentRuntime?.variables?.mapless?.battle ?? null;
    const message = formatSafariBattlePresentationEvent(event, {
      actorName: presentationName(currentRuntime, currentBattle, event.actor, event),
      targetName: presentationName(currentRuntime, currentBattle, event.target, event),
      moveName: SAFARI_MOVE_PRESENTATION[event.moveId]?.name ?? event.moveId,
      notice: currentRuntime?.variables?.mapless?.notice,
    });
    const messageNode = byId("battle-message");
    if (message && messageNode) {
      messageNode.dataset.presentationOwner = "event";
      messageNode.textContent = message;
    }
    if (event.type === "move_started") {
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

function saveIfRequested(currentRuntime, result) {
  const requested = result?.persistenceRequested
    || result?.operations?.some((operation) => operation?.op === "request_save");
  if (requested) saveSafariPlayableRun(window.localStorage, currentRuntime);
}

function restoreCommandRootIfReady() {
  const currentBattle = battle();
  const card = byId("battle-card");
  if (!card || card.hidden || currentBattle?.phase !== "COMMAND") return;
  card.dataset.dpptMenu = "root";
  const message = byId("battle-message");
  if (message) {
    delete message.dataset.presentationOwner;
    message.textContent = "どうする？";
  }
  requestAnimationFrame(() => {
    const fight = card.querySelector('#dppt-command-root button[data-dppt-command="fight"]');
    if (fight && !fight.disabled && !fight.hidden && fight.getClientRects().length > 0) fight.focus({ preventScroll: true });
  });
}

async function chooseSwitch(button) {
  if (selecting || !selectableBattle()) return;
  const partyIndex = Number(button.dataset.battleSwitchPartyIndex);
  const pokemon = partyPokemon(partyIndex);
  if (!Number.isInteger(partyIndex) || !pokemon || Number(pokemon.hp ?? 0) <= 0) return;

  selecting = true;
  if (button instanceof HTMLElement) {
    button.blur();
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
  }
  syncControls();
  const card = byId("battle-card");
  if (card) {
    card.dataset.dpptMenu = "locked";
    card.setAttribute("aria-busy", "true");
  }

  try {
    const currentRuntime = runtime();
    const result = switchSafariNormalBattlePlayer(currentRuntime, partyIndex);
    globalThis.__maplessLastBattleSwitchResult = result;
    if (result?.turnConsumed) {
      window.dispatchEvent(new CustomEvent("safari-game-menu-close-requested", { detail: { source: "battle-voluntary-switch" } }));
      const message = byId("battle-message");
      const ownerNotice = currentRuntime?.variables?.mapless?.notice;
      if (message && ownerNotice) {
        message.dataset.presentationOwner = "event";
        message.textContent = ownerNotice;
        await sleep(220);
      }
      await playPresentation(currentRuntime, result.presentation ?? []);
      saveIfRequested(currentRuntime, result);
    }
  } catch (error) {
    globalThis.__maplessLastError = error;
    console.error("[Mapless] voluntary Battle switch failed", error);
  } finally {
    selecting = false;
    if (card) card.removeAttribute("aria-busy");
    window.dispatchEvent(new CustomEvent("safari-runtime-changed"));
    restoreCommandRootIfReady();
    queueSync();
  }
}

document.addEventListener("click", (event) => {
  const button = event.target?.closest?.("button[data-battle-switch-party-index]");
  if (!button || button.disabled || !selectableBattle()) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void chooseSwitch(button);
}, true);

const grid = byId("party-detail-grid");
if (grid && typeof MutationObserver === "function") new MutationObserver(queueSync).observe(grid, { childList: true, subtree: true });
window.addEventListener("safari-game-menu-opened", (event) => { if (event.detail?.tab === "party") queueSync(); });
window.addEventListener("safari-runtime-changed", queueSync);
window.addEventListener("pageshow", queueSync);
queueSync();
