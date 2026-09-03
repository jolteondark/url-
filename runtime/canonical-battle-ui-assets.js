const CANONICAL_BATTLE_UI_ASSETS = Object.freeze({
  playerDatabox: "./assets/canonical-battle-ui/databox_normal.png",
  foeDatabox: "./assets/canonical-battle-ui/databox_normal_foe.png",
  messageOverlay: "./assets/canonical-battle-ui/overlay_message.png",
});

function preloadCanonicalBattleUiAsset(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(src);
    image.onerror = () => reject(new Error(`canonical Battle UI asset failed to load: ${src}`));
    image.src = src;
  });
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
#battle-card[data-canonical-battle-ui="error"] .battle-info-panel,
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
  try {
    await Promise.all(Object.values(CANONICAL_BATTLE_UI_ASSETS).map(preloadCanonicalBattleUiAsset));
    installCanonicalBattleUiStyle(documentRef);
    card.style.setProperty("--canonical-battle-player-databox", `url("${CANONICAL_BATTLE_UI_ASSETS.playerDatabox}")`);
    card.style.setProperty("--canonical-battle-foe-databox", `url("${CANONICAL_BATTLE_UI_ASSETS.foeDatabox}")`);
    card.style.setProperty("--canonical-battle-message-overlay", `url("${CANONICAL_BATTLE_UI_ASSETS.messageOverlay}")`);
    card.dataset.canonicalBattleUi = "ready";
    return CANONICAL_BATTLE_UI_ASSETS;
  } catch (error) {
    card.dataset.canonicalBattleUi = "error";
    globalThis.__maplessLastError = error instanceof Error ? error : new Error(String(error));
    throw globalThis.__maplessLastError;
  }
}

export { CANONICAL_BATTLE_UI_ASSETS };
