import {
  rememberCanonicalBattlebackDiagnostic,
  resolveCanonicalBattlebackAssets,
} from "./canonical-battleback-assets.js";

const preloadCache = new Map();

function preloadImage(src) {
  if (preloadCache.has(src)) return preloadCache.get(src);
  const pending = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(src);
    image.onerror = () => reject(new Error(`canonical Battleback failed to load: ${src}`));
    image.src = src;
  });
  preloadCache.set(src, pending);
  return pending;
}

function clearCanonicalBattleback(card) {
  card.style.removeProperty("--canonical-battleback-background");
  card.style.removeProperty("--canonical-battleback-player-base");
  card.style.removeProperty("--canonical-battleback-foe-base");
}

function installCanonicalBattlebackStyle(documentRef) {
  if (documentRef.getElementById("canonical-battleback-presentation-style")) return;
  const style = documentRef.createElement("style");
  style.id = "canonical-battleback-presentation-style";
  style.textContent = `
#battle-card[data-canonical-battleback="loading"] .arena,
#battle-card[data-canonical-battleback="error"] .arena,
#battle-card[data-canonical-battleback="unavailable"] .arena {
  background: none !important;
}
#battle-card[data-canonical-battleback="loading"] .arena::after,
#battle-card[data-canonical-battleback="error"] .arena::after,
#battle-card[data-canonical-battleback="unavailable"] .arena::after {
  display: none !important;
}
#battle-card[data-canonical-battleback="loading"] .battle-platform,
#battle-card[data-canonical-battleback="error"] .battle-platform,
#battle-card[data-canonical-battleback="unavailable"] .battle-platform {
  background: none !important;
}
#battle-card[data-canonical-battleback="ready"] .arena {
  background-image: var(--canonical-battleback-background) !important;
  background-repeat: no-repeat !important;
  background-position: center !important;
  background-size: 100% 100% !important;
}
#battle-card[data-canonical-battleback="ready"] .arena::after {
  display: none !important;
}
#battle-card[data-canonical-battleback="ready"] .battle-platform {
  background-color: transparent !important;
  background-repeat: no-repeat !important;
  background-position: center bottom !important;
  background-size: contain !important;
}
#battle-card[data-canonical-battleback="ready"] .player-platform {
  background-image: var(--canonical-battleback-player-base) !important;
}
#battle-card[data-canonical-battleback="ready"] .foe-platform {
  background-image: var(--canonical-battleback-foe-base) !important;
}
`;
  documentRef.head.appendChild(style);
}

export function installCanonicalBattlebackPresentation(documentRef = document) {
  const card = documentRef.getElementById("battle-card");
  if (!card) throw new Error("canonical Battleback install failed: #battle-card missing");
  installCanonicalBattlebackStyle(documentRef);

  let syncGeneration = 0;
  const sync = async () => {
    const generation = ++syncGeneration;
    const battle = globalThis.__maplessSafariRuntime?.variables?.mapless?.battle ?? null;
    if (!battle) {
      card.dataset.canonicalBattleback = "idle";
      delete card.dataset.canonicalBattlebackTimeOfDay;
      clearCanonicalBattleback(card);
      return null;
    }

    const timeOfDay = battle.timeOfDay ?? null;
    const assets = resolveCanonicalBattlebackAssets(timeOfDay);
    if (!assets) {
      card.dataset.canonicalBattleback = "unavailable";
      delete card.dataset.canonicalBattlebackTimeOfDay;
      clearCanonicalBattleback(card);
      rememberCanonicalBattlebackDiagnostic(timeOfDay, "unavailable", "missing_or_invalid_owner_time_of_day");
      return null;
    }

    card.dataset.canonicalBattleback = "loading";
    card.dataset.canonicalBattlebackTimeOfDay = String(timeOfDay).toUpperCase();
    clearCanonicalBattleback(card);
    rememberCanonicalBattlebackDiagnostic(timeOfDay, "loading");

    try {
      await Promise.all([
        preloadImage(assets.background),
        preloadImage(assets.playerBase),
        preloadImage(assets.foeBase),
      ]);
      if (generation !== syncGeneration) return null;
      const currentBattle = globalThis.__maplessSafariRuntime?.variables?.mapless?.battle ?? null;
      if (currentBattle !== battle || currentBattle?.timeOfDay !== timeOfDay) return null;
      card.style.setProperty("--canonical-battleback-background", `url("${assets.background}")`);
      card.style.setProperty("--canonical-battleback-player-base", `url("${assets.playerBase}")`);
      card.style.setProperty("--canonical-battleback-foe-base", `url("${assets.foeBase}")`);
      card.dataset.canonicalBattleback = "ready";
      rememberCanonicalBattlebackDiagnostic(timeOfDay, "ready");
      return Object.freeze({ timeOfDay, ...assets });
    } catch (error) {
      if (generation !== syncGeneration) return null;
      card.dataset.canonicalBattleback = "error";
      clearCanonicalBattleback(card);
      rememberCanonicalBattlebackDiagnostic(
        timeOfDay,
        "load_error",
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  };

  documentRef.defaultView?.addEventListener?.("safari-runtime-changed", sync);
  documentRef.defaultView?.addEventListener?.("safari-preview-start", sync);
  sync();
  return Object.freeze({ sync });
}
