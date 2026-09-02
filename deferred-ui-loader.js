const loadedStyles = new Set();
const loadedModules = new Map();
let sceneBundleSyncScheduled = false;
let gameMenuOpenPending = false;
let boardPresentationManifestPromise = null;
let battleChromePromise = null;
let trainerBattlePresentationPromise = null;

const BATTLE_PRESENTATION_PUBLIC_REVISION = "20260902-2300";
const battlePresentationUrl = (path) => `${path}?v=${BATTLE_PRESENTATION_PUBLIC_REVISION}`;
const MENU_SPRITE_PRESENTATION_PUBLIC_REVISION = "20260902-1800";

const boardPresentationFallbackModules = [
  "./berry-juice-shop-touch-presentation.js?v=20260901-1327",
  "./trainer-camp-touch-presentation.js?v=20260901-1327",
  "./old-statue-touch-presentation.js?v=20260901-1327",
  "./machine-gacha-touch-presentation.js?v=20260901-1327",
  "./wishing-fountain-touch-presentation.js?v=20260901-1327",
  "./item-collector-touch-presentation.js?v=20260901-1327",
  "./day-board-direct-persistence-handoff.js?v=20260901-1327",
  "./board-special-event-ui-handoff.js?v=20260901-1327",
  "./crumbling-bridge-touch-presentation.js?v=20260902-0312",
  "./bounty-poster-owner-action-handoff.js?v=20260901-1327",
];

function loadStyle(href) {
  if (loadedStyles.has(href)) return;
  loadedStyles.add(href);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.maplessDeferredStyle = href;
  document.head.append(link);
}

function loadModule(path) {
  if (loadedModules.has(path)) return loadedModules.get(path);
  const promise = import(path).catch((error) => {
    loadedModules.delete(path);
    console.error(`[Mapless] optional UI failed: ${path}`, error);
    return null;
  });
  loadedModules.set(path, promise);
  return promise;
}

async function loadBoardPresentationManifest() {
  if (!boardPresentationManifestPromise) {
    boardPresentationManifestPromise = fetch("./board-presentation-manifest.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`manifest HTTP ${response.status}`);
        return response.json();
      })
      .then((manifest) => Array.isArray(manifest?.modules) ? manifest.modules : boardPresentationFallbackModules)
      .catch((error) => {
        console.error("[Mapless] board presentation manifest failed; using fallback", error);
        return boardPresentationFallbackModules;
      });
  }
  return boardPresentationManifestPromise;
}

async function loadBoardPresentation() {
  loadStyle("./game-presentation.css?v=20260902-1700");
  loadStyle("./board-event-result-flow.css?v=20260819-2252");
  const presentationModules = await loadBoardPresentationManifest();
  return Promise.all([
    loadModule("./game-presentation.js?v=20260825-1030"),
    loadModule("./board-event-result-flow.js?v=20260819-2252"),
    ...presentationModules.map(loadModule),
  ]);
}

async function loadBattleUi() {
  loadStyle(battlePresentationUrl("./battle-core-safety.css"));
  await Promise.all([
    loadModule(battlePresentationUrl("./canonical-battle-sprite-bridge.js")),
    loadModule(battlePresentationUrl("./canonical-battle-back-atlas-patch.js")),
    loadModule(battlePresentationUrl("./canonical-battleback-message-bridge.js")),
    loadModule(battlePresentationUrl("./canonical-battleback-presentation-bridge.js")),
  ]);
}

function loadBattleChrome() {
  if (battleChromePromise) return battleChromePromise;
  loadStyle(battlePresentationUrl("./canonical-battle-ui.css"));
  loadStyle(battlePresentationUrl("./canonical-battle-status.css"));
  battleChromePromise = Promise.all([
    loadModule(battlePresentationUrl("./canonical-battle-ui-bridge.js")),
    loadModule(battlePresentationUrl("./canonical-battle-status-bridge.js")),
  ]).catch((error) => {
    battleChromePromise = null;
    throw error;
  });
  return battleChromePromise;
}

function loadTrainerBattlePresentation() {
  if (trainerBattlePresentationPromise) return trainerBattlePresentationPromise;
  loadStyle(battlePresentationUrl("./trainer-battle-presentation.css"));
  trainerBattlePresentationPromise = Promise.all([
    loadModule(battlePresentationUrl("./trainer-battle-presentation.js")),
    loadModule(battlePresentationUrl("./trainer-battle-canonical-sprite.js")),
  ]);
  return trainerBattlePresentationPromise;
}

async function loadShopUi() {
  loadStyle("./shop-touch-presentation.css?v=20260902-1400");
  await loadModule("./shop-touch-presentation.js?v=20260902-1400");
}

async function loadMenuUi() {
  loadStyle("./bridge-shell.css?v=20260902-1700");
  loadStyle("./game-menu.css?v=20260902-1700");
  const modules = await Promise.all([
    loadModule("./game-menu-bridge.js?v=20260821-0936"),
    loadModule("./party-panel-bridge.js?v=20260821-1535"),
    loadModule("./battle-party-voluntary-switch-bridge.js?v=20260821-1535"),
    loadModule(`./storage-panel-bridge.js?v=${MENU_SPRITE_PRESENTATION_PUBLIC_REVISION}`),
    loadModule("./party-storage-controls-bridge.js?v=20260822-0734"),
    loadModule(`./species-form-metadata-bridge.js?v=${MENU_SPRITE_PRESENTATION_PUBLIC_REVISION}`),
    loadModule(`./species-sprite-atlas-bridge.js?v=${MENU_SPRITE_PRESENTATION_PUBLIC_REVISION}`),
  ]);
  if (modules[0]) window.dispatchEvent(new CustomEvent("safari-game-menu-ui-ready"));
  return modules;
}

function menuUiReadyForTab(tab, modules) {
  if (!modules?.[0]) return false;
  if (tab === "party") return Boolean(modules[1]);
  if (tab === "box") return Boolean(modules[3]);
  return tab === "bag";
}

function syncSceneBundles() {
  const state = globalThis.__maplessSafariRuntime?.variables?.mapless;
  if (state?.battle) {
    loadBattleUi();
    loadBattleChrome();
    if (state.battle.kind === "trainer") loadTrainerBattlePresentation();
  }
  if (state?.shop) loadShopUi();
}

function scheduleSceneBundleSync() {
  if (sceneBundleSyncScheduled) return;
  sceneBundleSyncScheduled = true;
  requestAnimationFrame(() => {
    sceneBundleSyncScheduled = false;
    syncSceneBundles();
  });
}

function setBattleMenuOpenPending(pending) {
  gameMenuOpenPending = pending;
  const card = document.getElementById("battle-card");
  if (!card) return;
  if (pending) {
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && card.contains(focused)) focused.blur();
    card.setAttribute("aria-busy", "true");
  } else {
    card.removeAttribute("aria-busy");
  }
}

document.addEventListener("click", (event) => {
  if (!gameMenuOpenPending) return;
  if (!event.target.closest("#battle-card button")) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

document.addEventListener("click", (event) => {
  const start = event.target.closest("#new-run,#continue-run");
  if (start) {
    queueMicrotask(() => {
      loadBoardPresentation();
      loadBattleUi();
    });
    scheduleSceneBundleSync();
    return;
  }
  const menu = event.target.closest("#menu-party,#menu-bag,#menu-box");
  if (menu) {
    loadMenuUi();
    scheduleSceneBundleSync();
    return;
  }
  scheduleSceneBundleSync();
});

window.addEventListener("safari-game-menu-open-requested", async (event) => {
  const tab = event.detail?.tab;
  if (!new Set(["party", "bag", "box"]).has(tab) || gameMenuOpenPending) return;
  setBattleMenuOpenPending(true);
  try {
    const modules = await loadMenuUi();
    const battle = globalThis.__maplessSafariRuntime?.variables?.mapless?.battle;
    if (!battle || battle.phase !== "COMMAND") return;
    if (!menuUiReadyForTab(tab, modules)) {
      window.dispatchEvent(new CustomEvent("safari-game-menu-open-failed", { detail: { tab } }));
      return;
    }
    window.dispatchEvent(new CustomEvent("safari-game-menu-open-ready", { detail: { tab } }));
  } finally {
    setBattleMenuOpenPending(false);
  }
});
window.addEventListener("pageshow", scheduleSceneBundleSync, { passive: true });
window.addEventListener("safari-runtime-changed", scheduleSceneBundleSync, { passive: true });
syncSceneBundles();
