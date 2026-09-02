import "./trainer-battle-canonical-sprite.js?v=20260902-0657";
import { SAFARI_MOVE_MASTERS } from "./runtime/safari-playable-data.js";
import { canonicalBattleUiAssetUrl } from "./runtime/canonical-battle-ui-sources.js?v=20260902-0657";

const TYPE_ICON_ROWS = Object.freeze({
  NORMAL: 0,
  FIGHTING: 1,
  FLYING: 2,
  POISON: 3,
  GROUND: 4,
  ROCK: 5,
  BUG: 6,
  GHOST: 7,
  STEEL: 8,
  QMARKS: 9,
  FIRE: 10,
  WATER: 11,
  GRASS: 12,
  ELECTRIC: 13,
  PSYCHIC: 14,
  ICE: 15,
  DRAGON: 16,
  DARK: 17,
  FAIRY: 18,
});

const COMMAND_CURSOR_ROWS = Object.freeze({
  fight: 0,
  party: 1,
  bag: 2,
  flee: 3,
});

const CANONICAL_BATTLE_UI_CSS_ASSETS = Object.freeze({
  "--canonical-battle-databox-foe": "databox_normal_foe.png",
  "--canonical-battle-databox-player": "databox_normal.png",
  "--canonical-battle-hp-overlay": "overlay_hp.png",
  "--canonical-battle-message-overlay": "overlay_message.png",
  "--canonical-battle-fight-overlay": "overlay_fight.png",
  "--canonical-battle-command-overlay": "overlay_command.png",
  "--canonical-battle-types": "types.png",
  "--canonical-battle-status-icons": "icon_statuses.png",
  "--canonical-battle-level-overlay": "overlay_lv.png",
  "--canonical-battle-command-cursor": "cursor_command.png",
  "--canonical-battle-fight-cursor": "cursor_fight.png",
});

const grid = document.getElementById("moves");
const commandRoot = document.getElementById("dppt-command-root");
let syncScheduled = false;

function cssUrl(value) {
  return `url("${String(value).replaceAll('"', '%22')}")`;
}

function applyCanonicalBattleUiSources() {
  const card = document.getElementById("battle-card");
  if (!card) return;
  for (const [property, assetName] of Object.entries(CANONICAL_BATTLE_UI_CSS_ASSETS)) {
    const assetUrl = canonicalBattleUiAssetUrl(assetName);
    if (!assetUrl) {
      card.style.removeProperty(property);
      continue;
    }
    card.style.setProperty(property, cssUrl(assetUrl));
  }
}

function commandButtons() {
  if (!commandRoot) return [];
  return Array.from(commandRoot.querySelectorAll("button[data-dppt-command]"));
}

function applyCanonicalCommandCursor(button, row, selected) {
  const cursorUrl = canonicalBattleUiAssetUrl("cursor_command.png");
  if (!button || !cursorUrl) {
    button?.style.removeProperty("background-image");
    button?.style.removeProperty("background-size");
    button?.style.removeProperty("background-position");
    button?.style.removeProperty("background-repeat");
    return;
  }
  const clampedRow = Math.max(0, Math.min(9, Number(row) || 0));
  const y = (clampedRow / 9) * 100;
  button.style.backgroundImage = cssUrl(cursorUrl);
  button.style.backgroundSize = "200% 1000%";
  button.style.backgroundPosition = `${selected ? 100 : 0}% ${y}%`;
  button.style.backgroundRepeat = "no-repeat";
}

function selectCommandButton(button, buttons = commandButtons()) {
  for (const candidate of buttons) {
    const command = String(candidate.dataset.dpptCommand ?? "").trim().toLowerCase();
    const row = COMMAND_CURSOR_ROWS[command];
    if (row === undefined) {
      candidate.style.removeProperty("background-image");
      candidate.style.removeProperty("background-size");
      candidate.style.removeProperty("background-position");
      candidate.style.removeProperty("background-repeat");
      continue;
    }
    candidate.classList.toggle("canonical-command-selected", candidate === button);
    applyCanonicalCommandCursor(candidate, row, candidate === button);
  }
}

function bindCommandButton(button) {
  if (button.dataset.canonicalCommandCursorBound === "1") return;
  button.dataset.canonicalCommandCursorBound = "1";
  const select = () => selectCommandButton(button, commandButtons());
  button.addEventListener("focus", select);
  button.addEventListener("pointerenter", select, { passive: true });
  button.addEventListener("pointerdown", select, { passive: true });
}

function syncCommandMenu() {
  const buttons = commandButtons();
  if (buttons.length === 0) return;
  for (const button of buttons) bindCommandButton(button);
  const active = buttons.find((button) => button === document.activeElement)
    ?? buttons.find((button) => button.classList.contains("canonical-command-selected"))
    ?? buttons.find((button) => !button.disabled)
    ?? buttons[0];
  selectCommandButton(active, buttons);
}

function moveButtons() {
  if (!grid) return [];
  return Array.from(grid.children).filter((node) => node.matches?.("button[data-move-id]"));
}

function currentPp(button) {
  const text = button?.querySelector("small")?.textContent ?? "";
  const match = text.match(/PP\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function createInfoPanel() {
  const panel = document.createElement("div");
  panel.className = "canonical-move-info";
  panel.setAttribute("aria-live", "polite");

  const typeIcon = document.createElement("span");
  typeIcon.className = "canonical-move-type-icon";
  typeIcon.setAttribute("aria-hidden", "true");

  const pp = document.createElement("strong");
  pp.className = "canonical-move-pp";

  const typeLabel = document.createElement("span");
  typeLabel.className = "canonical-move-type-label";

  panel.append(typeIcon, pp, typeLabel);
  return panel;
}

function applyCanonicalFightCursor(button, row, selected) {
  const cursorUrl = canonicalBattleUiAssetUrl("cursor_fight.png");
  if (!button || !cursorUrl) {
    button?.style.removeProperty("background-image");
    button?.style.removeProperty("background-size");
    button?.style.removeProperty("background-position");
    button?.style.removeProperty("background-repeat");
    return;
  }
  const clampedRow = Math.max(0, Math.min(18, Number(row) || 0));
  const y = (clampedRow / 18) * 100;
  button.style.backgroundImage = cssUrl(cursorUrl);
  button.style.backgroundSize = "200% 1900%";
  button.style.backgroundPosition = `${selected ? 100 : 0}% ${y}%`;
  button.style.backgroundRepeat = "no-repeat";
}

function updateInfo(panel, button, buttons) {
  const moveId = button?.dataset.moveId ?? "";
  const master = SAFARI_MOVE_MASTERS[moveId] ?? null;
  const pp = currentPp(button);
  const totalPp = Number(master?.total_pp ?? 0);
  const type = String(master?.type ?? "QMARKS");
  const row = TYPE_ICON_ROWS[type] ?? TYPE_ICON_ROWS.QMARKS;

  panel.dataset.moveId = moveId;
  panel.querySelector(".canonical-move-type-icon").style.backgroundPosition = `0 -${row * 28}px`;
  panel.querySelector(".canonical-move-pp").textContent = totalPp > 0 && pp !== null
    ? `PP ${pp}/${totalPp}`
    : "PP ---";
  panel.querySelector(".canonical-move-type-label").textContent = `TYPE/${type}`;

  for (const candidate of buttons) {
    const candidateMaster = SAFARI_MOVE_MASTERS[candidate?.dataset.moveId ?? ""] ?? null;
    const candidateType = String(candidateMaster?.type ?? "QMARKS");
    const candidateRow = TYPE_ICON_ROWS[candidateType] ?? TYPE_ICON_ROWS.QMARKS;
    candidate.style.setProperty("--canonical-fight-row", String(candidateRow));
    candidate.classList.toggle("canonical-selected", candidate === button);
    applyCanonicalFightCursor(candidate, candidateRow, candidate === button);
  }
}

function bindButton(button, panel, buttons) {
  if (button.dataset.canonicalMoveInfoBound === "1") return;
  button.dataset.canonicalMoveInfoBound = "1";
  const select = () => updateInfo(panel, button, moveButtons());
  button.addEventListener("focus", select);
  button.addEventListener("pointerenter", select, { passive: true });
  button.addEventListener("pointerdown", select, { passive: true });
}

function syncFightMenu() {
  if (!grid) return;
  const buttons = moveButtons();
  let panel = Array.from(grid.children).find((node) => node.classList?.contains("canonical-move-info")) ?? null;

  if (buttons.length === 0) {
    panel?.remove();
    return;
  }

  if (!panel) {
    panel = createInfoPanel();
    grid.append(panel);
  }

  for (const button of buttons) bindButton(button, panel, buttons);
  const active = buttons.find((button) => button === document.activeElement)
    ?? buttons.find((button) => button.classList.contains("canonical-selected"))
    ?? buttons.find((button) => !button.disabled)
    ?? buttons[0];
  updateInfo(panel, active, buttons);
}

function scheduleSync() {
  if (syncScheduled) return;
  syncScheduled = true;
  requestAnimationFrame(() => {
    syncScheduled = false;
    applyCanonicalBattleUiSources();
    syncCommandMenu();
    syncFightMenu();
  });
}

applyCanonicalBattleUiSources();
if (commandRoot) {
  new MutationObserver(scheduleSync).observe(commandRoot, { childList: true, subtree: true });
  syncCommandMenu();
}
if (grid) {
  new MutationObserver(scheduleSync).observe(grid, { childList: true });
  syncFightMenu();
}
