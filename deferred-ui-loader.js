const loadedStyles = new Set();
const loadedModules = new Map();

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

async function loadBoardPresentation() {
  loadStyle("./game-presentation.css");
  loadStyle("./event-presentation.css");
  await Promise.all([
    loadModule("./game-presentation.js"),
    loadModule("./camp-presentation.js"),
  ]);
}

async function loadBattleUi() {
  // Keep the battle path intentionally minimal on iPhone Safari. The core
  // preview already renders the arena, HP, moves, capture and flee controls.
  // Extra HUD/result/trainer/terminal presentation modules were causing a
  // large burst of MutationObservers immediately after battle-card became
  // visible. Load only the canonical sprite layer here; embellishments can be
  // reintroduced after real-device responsiveness is proven.
  loadStyle("./battle-presentation.css");
  await loadModule("./canonical-battle-sprite-bridge.js");
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

function sceneIsVisible(id) {
  const node = document.getElementById(id);
  return Boolean(node && !node.hidden);
}

function syncSceneBundles() {
  if (sceneIsVisible("battle-card")) loadBattleUi();
  if (sceneIsVisible("shop-card")) loadShopUi();
}

document.addEventListener("click", (event) => {
  if (event.target.closest("#menu-party,#menu-bag,#menu-box")) {
    loadMenuUi();
    return;
  }
  if (event.target.closest("#board button[data-board-index]")) {
    loadBoardPresentation();
  }
}, { passive: true });

for (const id of ["battle-card", "shop-card"]) {
  const node = document.getElementById(id);
  if (!node) continue;
  new MutationObserver(syncSceneBundles).observe(node, {
    attributes: true,
    attributeFilter: ["hidden"],
  });
}

syncSceneBundles();
