const loadedStyles = new Set();
const loadedModules = new Map();
let sceneBundleSyncScheduled = false;

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

async function loadBoardPresentation() {
  loadStyle("./game-presentation.css");
  loadStyle("./event-presentation.css");
  return loadModule("./game-presentation.js");
}

async function loadBattleUi() {
  // Core battle safety is battle-scene-only; do not make initial page paint wait
  // for it. The core battle DOM/CSS already renders HP, moves, capture and flee.
  loadStyle("./battle-core-safety.css");
  await loadModule("./canonical-battle-sprite-bridge.js?v=20260818-1755");
}

async function loadShopUi() {
  loadStyle("./shop-touch-presentation.css");
  await loadModule("./shop-touch-presentation.js");
}

async function loadMenuUi() {
  loadStyle("./bridge-shell.css");
  loadStyle("./game-menu.css");
  await Promise.all([
    loadModule("./game-menu-bridge.js?v=20260819-0225"),
    loadModule("./party-panel-bridge.js"),
    loadModule("./storage-panel-bridge.js"),
    loadModule("./party-storage-controls-bridge.js"),
    loadModule("./species-form-metadata-bridge.js"),
    loadModule("./species-sprite-atlas-bridge.js"),
  ]);
}

function syncSceneBundles() {
  const state = globalThis.__maplessSafariRuntime?.variables?.mapless;
  if (state?.battle) loadBattleUi();
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

document.addEventListener("click", (event) => {
  const start = event.target.closest("#new-run,#continue-run");
  if (start) {
    // Let preview.js arm the static board immediately, then add decorative board
    // presentation without putting it back on the document startup path.
    queueMicrotask(() => loadBoardPresentation());
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

window.addEventListener("pageshow", scheduleSceneBundleSync, { passive: true });
window.addEventListener("safari-runtime-changed", scheduleSceneBundleSync, { passive: true });
syncSceneBundles();
