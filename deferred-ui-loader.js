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
    console.error(`[Mapless] optional UI failed: ${path}`, error);
  });
  loadedModules.set(path, promise);
  return promise;
}

async function loadCampPresentation() {
  return loadModule("./camp-presentation.js");
}

async function loadBattleUi() {
  // Battle UI stays scene-demand only. Runtime-backed projections refresh from
  // explicit Safari events instead of inferring state from DOM mutations.
  loadStyle("./canonical-battle-ui.css");
  loadStyle("./canonical-battle-status.css");
  loadStyle("./trainer-battle-presentation.css");
  await loadModule("./canonical-battle-sprite-bridge.js");
  await loadModule("./canonical-battle-ui-bridge.js");
  await loadModule("./canonical-battle-status-bridge.js");
  await loadModule("./trainer-battle-presentation.js");
}

async function loadShopUi() {
  loadStyle("./shop-touch-presentation.css");
  await loadModule("./shop-touch-presentation.js");
}

async function loadMenuUi() {
  loadStyle("./game-menu.css");
  await Promise.all([
    loadModule("./game-menu-bridge.js"),
    loadModule("./party-panel-bridge.js"),
    loadModule("./storage-panel-bridge.js"),
    loadModule("./party-storage-controls-bridge.js"),
    loadModule("./species-form-metadata-bridge.js"),
    loadModule("./species-sprite-atlas-bridge.js"),
  ]);
}

function boardEventForButton(button) {
  const index = Number(button?.dataset?.boardIndex);
  if (!Number.isInteger(index)) return null;
  return globalThis.__maplessSafariRuntime?.variables?.mapless?.board_events?.[index] ?? null;
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
  const menu = event.target.closest("#menu-party,#menu-bag,#menu-box");
  if (menu) {
    loadMenuUi();
    scheduleSceneBundleSync();
    return;
  }

  const button = event.target.closest("#board button[data-board-index]");
  if (button && boardEventForButton(button)?.kind === "next_day") {
    // Camp carries Pokemon Runtime + boundary preparation. Keep it completely
    // off wild/trainer/shop/normal-event clicks. Capture this one interaction
    // so the first next_day click cannot race the dynamic module import.
    event.preventDefault();
    event.stopImmediatePropagation();
    const index = Number(button.dataset.boardIndex);
    loadCampPresentation().then((camp) => camp?.openSafariCamp?.(button, index));
    return;
  }

  scheduleSceneBundleSync();
}, { capture: true });

window.addEventListener("pageshow", scheduleSceneBundleSync, { passive: true });
window.addEventListener("safari-runtime-changed", scheduleSceneBundleSync, { passive: true });
syncSceneBundles();
