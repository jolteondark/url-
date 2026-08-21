const loadedStyles = new Set();
const loadedModules = new Map();
let sceneBundleSyncScheduled = false;
let gameMenuOpenPending = false;

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
  loadStyle("./board-event-result-flow.css?v=20260819-2252");
  return Promise.all([
    loadModule("./game-presentation.js"),
    loadModule("./board-event-result-flow.js?v=20260819-2252"),
  ]);
}

async function loadBattleUi() {
  loadStyle("./battle-core-safety.css");
  await Promise.all([
    loadModule("./canonical-battle-sprite-bridge.js?v=20260820-1334"),
    loadModule("./canonical-battle-back-atlas-patch.js?v=20260821-1903"),
  ]);
}

async function loadShopUi() {
  loadStyle("./shop-touch-presentation.css");
  await loadModule("./shop-touch-presentation.js");
}

async function loadMenuUi() {
  loadStyle("./bridge-shell.css");
  loadStyle("./game-menu.css");
  const modules = await Promise.all([
    loadModule("./game-menu-bridge.js?v=20260821-0936"),
    loadModule("./party-panel-bridge.js?v=20260821-1535"),
    loadModule("./battle-party-voluntary-switch-bridge.js?v=20260821-1535"),
    loadModule("./storage-panel-bridge.js"),
    loadModule("./party-storage-controls-bridge.js"),
    loadModule("./species-form-metadata-bridge.js"),
    loadModule("./species-sprite-atlas-bridge.js"),
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
