import { SAFARI_MOVE_PRESENTATION } from "./safari-move-presentation-live.js";

const CANONICAL_BATTLE_UI_ASSETS = Object.freeze({
  playerDatabox: "./assets/canonical-battle-ui/databox_normal.png",
  foeDatabox: "./assets/canonical-battle-ui/databox_normal_foe.png",
  messageOverlay: "./assets/canonical-battle-ui/overlay_message.png",
  fightOverlay: "./assets/canonical-battle-ui/overlay_fight.png",
  hpOverlay: "./assets/canonical-battle-ui/overlay_hp.png",
  levelOverlay: "./assets/canonical-battle-ui/overlay_lv.png",
  commandCursor: "./assets/canonical-battle-ui/cursor_command.png",
  fightCursor: "./assets/canonical-battle-ui/cursor_fight.png",
});

const CANONICAL_BATTLE_UI_REQUIRED_ASSET_KEYS = Object.freeze([
  "playerDatabox",
  "foeDatabox",
  "messageOverlay",
  "fightOverlay",
  "hpOverlay",
  "levelOverlay",
  "commandCursor",
]);

const CANONICAL_FIGHT_CURSOR_ICON_POSITION = Object.freeze({
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
const CANONICAL_FIGHT_CURSOR_ROW_COUNT = 19;

function preloadCanonicalBattleUiAsset(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(src);
    image.onerror = () => reject(new Error(`canonical Battle UI asset failed to load: ${src}`));
    image.src = src;
  });
}

function rememberCanonicalBattleUiDiagnostic(asset, state, src, error = null) {
  globalThis.__maplessCanonicalBattleUiDiagnostic = Object.freeze({
    asset,
    state,
    src,
    message: error instanceof Error ? error.message : error == null ? null : String(error),
  });
}

async function installCanonicalBattleFightCursor(card) {
  const src = CANONICAL_BATTLE_UI_ASSETS.fightCursor;
  card.dataset.canonicalBattleFightCursor = "loading";
  card.style.removeProperty("--canonical-battle-fight-cursor");
  try {
    await preloadCanonicalBattleUiAsset(src);
    card.style.setProperty("--canonical-battle-fight-cursor", `url("${src}")`);
    card.dataset.canonicalBattleFightCursor = "ready";
    rememberCanonicalBattleUiDiagnostic("fightCursor", "ready", src);
  } catch (error) {
    card.dataset.canonicalBattleFightCursor = "error";
    rememberCanonicalBattleUiDiagnostic("fightCursor", "unavailable", src, error);
  }
}

function syncCanonicalFightCursorType(button) {
  const moveId = button?.dataset?.moveId;
  const type = moveId ? SAFARI_MOVE_PRESENTATION[moveId]?.type : null;
  const iconPosition = type == null ? null : CANONICAL_FIGHT_CURSOR_ICON_POSITION[type];
  if (!Number.isInteger(iconPosition)) {
    button?.style?.removeProperty("--canonical-fight-cursor-y");
    if (button?.dataset) delete button.dataset.canonicalFightCursorType;
    return;
  }
  button.dataset.canonicalFightCursorType = type;
  button.style.setProperty(
    "--canonical-fight-cursor-y",
    `${(iconPosition / (CANONICAL_FIGHT_CURSOR_ROW_COUNT - 1)) * 100}%`,
  );
}

function installCanonicalFightCursorTypePresentation(documentRef) {
  const moves = documentRef.getElementById("moves");
  if (!moves) throw new Error("canonical fight cursor presentation requires #moves");
  const syncAll = () => moves.querySelectorAll("button[data-move-id]").forEach(syncCanonicalFightCursorType);
  syncAll();
  const MutationObserverRef = documentRef.defaultView?.MutationObserver ?? globalThis.MutationObserver;
  if (!MutationObserverRef) throw new Error("canonical fight cursor presentation requires MutationObserver");
  const observer = new MutationObserverRef(syncAll);
  observer.observe(moves, { childList: true, subtree: true });
}

function installCanonicalBattleLevelPresentation(documentRef) {
  const levelNodes = [documentRef.getElementById("foe-level"), documentRef.getElementById("player-level")].filter(Boolean);
  const syncLevel = (node) => {
    const match = String(node.textContent ?? "").match(/(?:Lv\.)?\s*(\d+)/i);
    if (match) node.dataset.canonicalBattleLevel = match[1];
    else delete node.dataset.canonicalBattleLevel;
  };
  levelNodes.forEach(syncLevel);

  const MutationObserverRef = documentRef.defaultView?.MutationObserver ?? globalThis.MutationObserver;
  if (!MutationObserverRef) throw new Error("canonical Battle level presentation requires MutationObserver");
  const observer = new MutationObserverRef((records) => {
    for (const record of records) {
      const node = record.target?.nodeType === 3 ? record.target.parentElement : record.target;
      const levelNode = node?.closest?.("#foe-level, #player-level");
      if (levelNode) syncLevel(levelNode);
    }
  });
  levelNodes.forEach((node) => observer.observe(node, { childList: true, characterData: true, subtree: true }));
}

function installCanonicalBattleUiStyle(documentRef) {
  if (documentRef.getElementById("canonical-battle-ui-assets-style")) return;
  const style = documentRef.createElement("style");
  style.id = "canonical-battle-ui-assets-style";
  style.textContent = `
#battle-card[data-canonical-battle-ui="ready"] .battle-info-panel {
  border: 0 !important;
  border-radius: 0 !important;
  clip-path: none !important;
  box-shadow: none !important;
  background-color: transparent !important;
  background-repeat: no-repeat !important;
  background-position: center !important;
  background-size: 100% 100% !important;
}
#battle-card[data-canonical-battle-ui="ready"] .player-info {
  background-image: var(--canonical-battle-player-databox) !important;
}
#battle-card[data-canonical-battle-ui="ready"] .foe-info {
  background-image: var(--canonical-battle-foe-databox) !important;
}
#battle-card[data-canonical-battle-ui="ready"] #foe-level,
#battle-card[data-canonical-battle-ui="ready"] #player-level {
  display: inline-flex !important;
  align-items: center !important;
  min-height: 14px !important;
  padding-left: 24px !important;
  font-size: 0 !important;
  background-image: var(--canonical-battle-level-overlay) !important;
  background-repeat: no-repeat !important;
  background-position: left center !important;
  background-size: 22px 14px !important;
}
#battle-card[data-canonical-battle-ui="ready"] #foe-level::after,
#battle-card[data-canonical-battle-ui="ready"] #player-level::after {
  content: attr(data-canonical-battle-level) !important;
  font-size: .58rem !important;
}
#battle-card[data-canonical-battle-ui="ready"] .hp-track {
  position: relative !important;
  border: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
  padding: 0 !important;
  overflow: hidden !important;
}
#battle-card[data-canonical-battle-ui="ready"] .hp-track span {
  display: block !important;
  height: 100% !important;
  border-radius: 0 !important;
  background-color: transparent !important;
  background-image: var(--canonical-battle-hp-overlay) !important;
  background-repeat: no-repeat !important;
  background-position: center top !important;
  background-size: 100% 300% !important;
}
#battle-card[data-canonical-battle-ui="ready"] .battle-info-panel[data-hp-zone="yellow"] .hp-track span {
  background-position: center 50% !important;
}
#battle-card[data-canonical-battle-ui="ready"] .battle-info-panel[data-hp-zone="red"] .hp-track span {
  background-position: center bottom !important;
}
#battle-card[data-canonical-battle-ui="ready"] .battle-message {
  border: 0 !important;
  box-shadow: none !important;
  background-color: transparent !important;
  background-image: var(--canonical-battle-message-overlay) !important;
  background-repeat: no-repeat !important;
  background-position: center !important;
  background-size: 100% 100% !important;
}
#battle-card[data-canonical-battle-ui="ready"] .battle-message::after {
  content: none !important;
  display: none !important;
}
#battle-card[data-canonical-battle-ui="ready"][data-dppt-menu="fight"] .move-grid {
  background-color: transparent !important;
  background-image: var(--canonical-battle-fight-overlay) !important;
  background-repeat: no-repeat !important;
  background-position: center !important;
  background-size: 100% 100% !important;
}
#battle-card[data-canonical-battle-ui="ready"] .dppt-command-root button,
#battle-card[data-canonical-battle-ui="ready"][data-dppt-menu="fight"] .move-grid button {
  position: relative !important;
}
#battle-card[data-canonical-battle-ui="ready"] .dppt-command-root button[data-dppt-command="fight"] { --canonical-command-cursor-y: 0%; }
#battle-card[data-canonical-battle-ui="ready"] .dppt-command-root button[data-dppt-command="party"] { --canonical-command-cursor-y: 11.111111%; }
#battle-card[data-canonical-battle-ui="ready"] .dppt-command-root button[data-dppt-command="bag"] { --canonical-command-cursor-y: 22.222222%; }
#battle-card[data-canonical-battle-ui="ready"] .dppt-command-root button[data-dppt-command="flee"] { --canonical-command-cursor-y: 33.333333%; }
#battle-card[data-canonical-battle-ui="ready"] .dppt-command-root button:focus-visible::before,
#battle-card[data-canonical-battle-ui="ready"] .dppt-command-root button:active::before {
  content: "" !important;
  display: block !important;
  position: absolute !important;
  inset: -5px !important;
  opacity: 1 !important;
  pointer-events: none !important;
  z-index: 4 !important;
  background-image: var(--canonical-battle-command-cursor) !important;
  background-repeat: no-repeat !important;
  background-position: 100% var(--canonical-command-cursor-y, 0%) !important;
  background-size: 200% 1000% !important;
}
#battle-card[data-canonical-battle-ui="ready"][data-canonical-battle-fight-cursor="ready"][data-dppt-menu="fight"] .move-grid button[data-canonical-fight-cursor-type]:focus-visible::before,
#battle-card[data-canonical-battle-ui="ready"][data-canonical-battle-fight-cursor="ready"][data-dppt-menu="fight"] .move-grid button[data-canonical-fight-cursor-type]:active::before {
  content: "" !important;
  display: block !important;
  position: absolute !important;
  inset: -5px !important;
  opacity: 1 !important;
  pointer-events: none !important;
  z-index: 4 !important;
  background-image: var(--canonical-battle-fight-cursor) !important;
  background-repeat: no-repeat !important;
  background-position: 100% var(--canonical-fight-cursor-y) !important;
  background-size: 200% 1900% !important;
}
#battle-card[data-canonical-battle-ui="ready"][data-canonical-battle-fight-cursor="ready"][data-dppt-menu="fight"] .move-grid button[data-canonical-fight-cursor-type]:focus-visible,
#battle-card[data-canonical-battle-ui="ready"][data-canonical-battle-fight-cursor="ready"][data-dppt-menu="fight"] .move-grid button[data-canonical-fight-cursor-type]:active:not(:disabled) {
  outline: 0 !important;
  transform: none !important;
}
#battle-card[data-canonical-battle-ui="loading"] .battle-info-panel,
#battle-card[data-canonical-battle-ui="loading"] .battle-command-panel,
#battle-card[data-canonical-battle-ui="loading"] .battle-message,
#battle-card[data-canonical-battle-ui="error"] .battle-info-panel,
#battle-card[data-canonical-battle-ui="error"] .battle-command-panel,
#battle-card[data-canonical-battle-ui="error"] .battle-message {
  visibility: hidden !important;
}
`;
  documentRef.head.appendChild(style);
}

export async function installCanonicalBattleUiAssets(documentRef = document) {
  const card = documentRef.getElementById("battle-card");
  if (!card) throw new Error("canonical Battle UI install failed: #battle-card missing");
  card.dataset.canonicalBattleUi = "loading";
  installCanonicalBattleUiStyle(documentRef);
  try {
    await Promise.all(CANONICAL_BATTLE_UI_REQUIRED_ASSET_KEYS.map((key) => preloadCanonicalBattleUiAsset(CANONICAL_BATTLE_UI_ASSETS[key])));
    installCanonicalBattleLevelPresentation(documentRef);
    installCanonicalFightCursorTypePresentation(documentRef);
    card.style.setProperty("--canonical-battle-player-databox", `url("${CANONICAL_BATTLE_UI_ASSETS.playerDatabox}")`);
    card.style.setProperty("--canonical-battle-foe-databox", `url("${CANONICAL_BATTLE_UI_ASSETS.foeDatabox}")`);
    card.style.setProperty("--canonical-battle-message-overlay", `url("${CANONICAL_BATTLE_UI_ASSETS.messageOverlay}")`);
    card.style.setProperty("--canonical-battle-fight-overlay", `url("${CANONICAL_BATTLE_UI_ASSETS.fightOverlay}")`);
    card.style.setProperty("--canonical-battle-hp-overlay", `url("${CANONICAL_BATTLE_UI_ASSETS.hpOverlay}")`);
    card.style.setProperty("--canonical-battle-level-overlay", `url("${CANONICAL_BATTLE_UI_ASSETS.levelOverlay}")`);
    card.style.setProperty("--canonical-battle-command-cursor", `url("${CANONICAL_BATTLE_UI_ASSETS.commandCursor}")`);
    await installCanonicalBattleFightCursor(card);
    card.dataset.canonicalBattleUi = "ready";
    return CANONICAL_BATTLE_UI_ASSETS;
  } catch (error) {
    card.dataset.canonicalBattleUi = "error";
    globalThis.__maplessLastError = error instanceof Error ? error : new Error(String(error));
    throw globalThis.__maplessLastError;
  }
}

export { CANONICAL_BATTLE_UI_ASSETS, CANONICAL_FIGHT_CURSOR_ICON_POSITION };
