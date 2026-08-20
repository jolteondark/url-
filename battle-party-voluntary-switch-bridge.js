import { switchSafariNormalBattlePlayer } from "./runtime/safari-normal-battle-voluntary-switch.js";

const byId = (id) => document.getElementById(id);
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

async function chooseSwitch(button) {
  if (selecting || !selectableBattle()) return;
  const partyIndex = Number(button.dataset.battleSwitchPartyIndex);
  const pokemon = partyPokemon(partyIndex);
  if (!Number.isInteger(partyIndex) || !pokemon || Number(pokemon.hp ?? 0) <= 0) return;

  selecting = true;
  syncControls();
  try {
    const result = switchSafariNormalBattlePlayer(runtime(), partyIndex);
    globalThis.__maplessLastBattleSwitchResult = result;
    if (result?.turnConsumed) {
      window.dispatchEvent(new CustomEvent("safari-game-menu-close-requested", {
        detail: { source: "battle-voluntary-switch" },
      }));
    }
    window.dispatchEvent(new CustomEvent("safari-runtime-changed"));
  } catch (error) {
    globalThis.__maplessLastError = error;
    console.error("[Mapless] voluntary Battle switch failed", error);
  } finally {
    selecting = false;
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
if (grid && typeof MutationObserver === "function") {
  new MutationObserver(queueSync).observe(grid, { childList: true, subtree: true });
}

window.addEventListener("safari-game-menu-opened", (event) => {
  if (event.detail?.tab === "party") queueSync();
});
window.addEventListener("safari-runtime-changed", queueSync);
window.addEventListener("pageshow", queueSync);
queueSync();
