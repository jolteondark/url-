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

function preloadCanonicalBattleUiAsset(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(src);
    image.onerror = () => reject(new Error(`canonical Battle UI asset failed to load: ${src}`));
    image.src = src;
  });
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
  background-position: center !important;
  background-size: 100% 100% !important;
}
#battle-card[data-canonical-battle-ui="ready"][data-dppt-menu="fight"] .move-grid button:focus-visible::before,
#battle-card[data-canonical-battle-ui="ready"][data-dppt-menu="fight"] .move-grid button:active::before {
  content: "" !important;
  display: block !important;
  position: absolute !important;
  inset: -5px !important;
  opacity: 1 !important;
  pointer-events: none !important;
  z-index: 4 !important;
  background-image: var(--canonical-battle-fight-cursor) !important;
  background-repeat: no-repeat !important;
  background-position: center !important;
  background-size: 100% 100% !important;
}
#battle-card[data-canonical-battle-ui="ready"][data-dppt-menu="fight"] .move-grid button:focus-visible,
#battle-card[data-canonical-battle-ui="ready"][data-dppt-menu="fight"] .move-grid button:active:not(:disabled) {
  outline: 0 !important;
  transform: none !important;
}
#battle-card[data-canonical-battle-ui="loading"] .battle-info-panel,
#battle-card[data-canonical-battle-ui="loading"] .battle-command-panel,
#battle-card[data-canonical-battle-ui="error"] .battle-info-panel,
#battle-card[data-canonical-battle-ui="error"] .battle-command-panel {
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
    await Promise.all(Object.values(CANONICAL_BATTLE_UI_ASSETS).map(preloadCanonicalBattleUiAsset));
    installCanonicalBattleLevelPresentation(documentRef);
    card.style.setProperty("--canonical-battle-player-databox", `url("${CANONICAL_BATTLE_UI_ASSETS.playerDatabox}")`);
    card.style.setProperty("--canonical-battle-foe-databox", `url("${CANONICAL_BATTLE_UI_ASSETS.foeDatabox}")`);
    card.style.setProperty("--canonical-battle-message-overlay", `url("${CANONICAL_BATTLE_UI_ASSETS.messageOverlay}")`);
    card.style.setProperty("--canonical-battle-fight-overlay", `url("${CANONICAL_BATTLE_UI_ASSETS.fightOverlay}")`);
    card.style.setProperty("--canonical-battle-hp-overlay", `url("${CANONICAL_BATTLE_UI_ASSETS.hpOverlay}")`);
    card.style.setProperty("--canonical-battle-level-overlay", `url("${CANONICAL_BATTLE_UI_ASSETS.levelOverlay}")`);
    card.style.setProperty("--canonical-battle-command-cursor", `url("${CANONICAL_BATTLE_UI_ASSETS.commandCursor}")`);
    card.style.setProperty("--canonical-battle-fight-cursor", `url("${CANONICAL_BATTLE_UI_ASSETS.fightCursor}")`);
    card.dataset.canonicalBattleUi = "ready";
    return CANONICAL_BATTLE_UI_ASSETS;
  } catch (error) {
    card.dataset.canonicalBattleUi = "error";
    globalThis.__maplessLastError = error instanceof Error ? error : new Error(String(error));
    throw globalThis.__maplessLastError;
  }
}

export { CANONICAL_BATTLE_UI_ASSETS };
