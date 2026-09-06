const CANONICAL_BATTLE_STATUS_ASSET = "./assets/canonical-battle-ui/icon_statuses.png";

const CANONICAL_BATTLE_STATUS_ICON_POSITION = Object.freeze({
  SLEEP: 0,
  POISON: 1,
  BURN: 2,
  PARALYSIS: 3,
  FROZEN: 4,
});

// Pokémon Essentials v21.1 Battle icon_statuses.png keeps toxic as the sixth
// row after the five registered non-NONE statuses. Runtime status remains
// owner truth; Presentation only selects the matching canonical visual row.
const CANONICAL_BATTLE_STATUS_ROW_COUNT = 6;

function preloadCanonicalBattleStatusAsset(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(src);
    image.onerror = () => reject(new Error(`canonical Battle status asset failed to load: ${src}`));
    image.src = src;
  });
}

function rememberCanonicalBattleStatusDiagnostic(state, detail = {}) {
  globalThis.__maplessCanonicalBattleStatusDiagnostic = Object.freeze({
    state,
    src: CANONICAL_BATTLE_STATUS_ASSET,
    ...detail,
  });
}

function normalizeStatus(value) {
  const status = String(value ?? "NONE").trim().toUpperCase();
  return status || "NONE";
}

function activeBattlePlayer(runtime, battle) {
  const index = Number(battle?.player_party_index ?? 0);
  return runtime?.player?.party?.[index] ?? runtime?.player?.party?.[0] ?? null;
}

function statusTarget(documentRef, side) {
  const panel = documentRef.querySelector(`#${side}-combatant .battle-info-panel`);
  if (!panel) throw new Error(`canonical Battle status presentation requires ${side} battle info panel`);
  let icon = panel.querySelector(`.canonical-battle-status-icon[data-side="${side}"]`);
  if (!icon) {
    icon = documentRef.createElement("span");
    icon.className = "canonical-battle-status-icon";
    icon.dataset.side = side;
    icon.setAttribute("aria-hidden", "true");
    panel.appendChild(icon);
  }
  return { panel, icon };
}

function syncStatusTarget(target, status) {
  const normalized = normalizeStatus(status);
  const iconPosition = CANONICAL_BATTLE_STATUS_ICON_POSITION[normalized];
  if (normalized === "NONE") {
    target.icon.hidden = true;
    delete target.panel.dataset.canonicalBattleStatus;
    target.icon.style.removeProperty("--canonical-battle-status-y");
    return;
  }
  if (!Number.isInteger(iconPosition)) {
    target.icon.hidden = true;
    delete target.panel.dataset.canonicalBattleStatus;
    target.icon.style.removeProperty("--canonical-battle-status-y");
    rememberCanonicalBattleStatusDiagnostic("unsupported_status", { status: normalized });
    return;
  }
  target.panel.dataset.canonicalBattleStatus = normalized;
  target.icon.style.setProperty(
    "--canonical-battle-status-y",
    `${(iconPosition / (CANONICAL_BATTLE_STATUS_ROW_COUNT - 1)) * 100}%`,
  );
  target.icon.hidden = false;
}

function installCanonicalBattleStatusStyle(documentRef) {
  if (documentRef.getElementById("canonical-battle-status-assets-style")) return;
  const style = documentRef.createElement("style");
  style.id = "canonical-battle-status-assets-style";
  style.textContent = `
#battle-card[data-canonical-battle-status-asset="ready"] .battle-info-panel {
  position: relative !important;
}
#battle-card[data-canonical-battle-status-asset="ready"] .canonical-battle-status-icon {
  position: absolute !important;
  top: 36px !important;
  width: 44px !important;
  height: 16px !important;
  pointer-events: none !important;
  z-index: 3 !important;
  background-image: var(--canonical-battle-status-icons) !important;
  background-repeat: no-repeat !important;
  background-position: 0 var(--canonical-battle-status-y, 0%) !important;
  background-size: 100% 600% !important;
}
#battle-card[data-canonical-battle-status-asset="ready"] .foe-info .canonical-battle-status-icon {
  left: 16% !important;
}
#battle-card[data-canonical-battle-status-asset="ready"] .player-info .canonical-battle-status-icon {
  left: 24% !important;
}
`;
  documentRef.head.appendChild(style);
}

export async function installCanonicalBattleStatusAssets(documentRef = document) {
  const card = documentRef.getElementById("battle-card");
  if (!card) throw new Error("canonical Battle status install failed: #battle-card missing");
  installCanonicalBattleStatusStyle(documentRef);
  const playerTarget = statusTarget(documentRef, "player");
  const foeTarget = statusTarget(documentRef, "foe");
  card.dataset.canonicalBattleStatusAsset = "loading";
  card.style.removeProperty("--canonical-battle-status-icons");

  const sync = () => {
    const runtime = globalThis.__maplessSafariRuntime;
    const battle = runtime?.variables?.mapless?.battle ?? null;
    if (!battle) {
      syncStatusTarget(playerTarget, "NONE");
      syncStatusTarget(foeTarget, "NONE");
      return;
    }
    syncStatusTarget(playerTarget, activeBattlePlayer(runtime, battle)?.status);
    syncStatusTarget(foeTarget, battle.foe?.status);
  };

  try {
    await preloadCanonicalBattleStatusAsset(CANONICAL_BATTLE_STATUS_ASSET);
    card.style.setProperty("--canonical-battle-status-icons", `url("${CANONICAL_BATTLE_STATUS_ASSET}")`);
    card.dataset.canonicalBattleStatusAsset = "ready";
    rememberCanonicalBattleStatusDiagnostic("ready");
    sync();
    documentRef.defaultView?.addEventListener?.("safari-runtime-changed", sync);
    return Object.freeze({ src: CANONICAL_BATTLE_STATUS_ASSET });
  } catch (error) {
    card.dataset.canonicalBattleStatusAsset = "error";
    playerTarget.icon.hidden = true;
    foeTarget.icon.hidden = true;
    rememberCanonicalBattleStatusDiagnostic("unavailable", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export {
  CANONICAL_BATTLE_STATUS_ASSET,
  CANONICAL_BATTLE_STATUS_ICON_POSITION,
  CANONICAL_BATTLE_STATUS_ROW_COUNT,
};
