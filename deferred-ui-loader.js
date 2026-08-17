const loadedStyles = new Set();
const loadedModules = new Map();
const replayingCombatClicks = new WeakSet();
let activeGeneralLoadLabel = null;

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
  // Battle UI stays scene-demand only. All observers are scoped below the
  // battle scene and avoid attribute/hidden self-observation on Safari.
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

function sceneIsVisible(id) {
  const node = document.getElementById(id);
  return Boolean(node && !node.hidden);
}

function syncSceneBundles() {
  if (sceneIsVisible("battle-card")) loadBattleUi();
  if (sceneIsVisible("shop-card")) loadShopUi();
}

function battleNeedsGeneralData(battle) {
  if (!battle || battle.completed) return false;
  if (battle.origin === "boundary_trial") return true;
  if (battle.general_selection != null) return true;
  return battle.kind === "trainer" && battle.origin !== "village_bounty" && Array.isArray(battle.trainer?.party);
}

function setCombatLoadingNotice(text) {
  const battleMessage = document.getElementById("battle-message");
  const notice = document.getElementById("notice");
  if (battleMessage && !document.getElementById("battle-card")?.hidden) battleMessage.textContent = text;
  else if (notice) notice.textContent = text;
}

window.addEventListener("safari-general-load-progress", (event) => {
  if (!activeGeneralLoadLabel) return;
  const loaded = Number(event.detail?.loaded ?? 0);
  const total = Number(event.detail?.total ?? 0);
  const phase = event.detail?.phase;
  let progress = "";
  if (phase === "decompress") progress = " 展開中…";
  else if (phase === "ready") progress = " 準備完了";
  else if (loaded > 0 && total > 0) progress = ` ${loaded}/${total}`;
  setCombatLoadingNotice(activeGeneralLoadLabel + progress);
}, { passive: true });

// A click gate is cheaper and safer on iPhone Safari than loading the entire
// 875-species/608-move projection on preview bootstrap. No DOM subtree observer
// is involved: only an actual combat/wounded-event entry can wake this path.
document.addEventListener("click", async (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  const boardButton = target.closest("#board button[data-board-index]");
  const moveButton = target.closest("#moves button[data-move-id]");
  const button = boardButton ?? moveButton;
  if (!button) return;
  if (replayingCombatClicks.has(button)) {
    replayingCombatClicks.delete(button);
    return;
  }

  const runtime = globalThis.__maplessSafariRuntime;
  const state = runtime?.variables?.mapless;
  if (!state) return;

  let mode = null;
  if (boardButton) {
    const index = Number(boardButton.dataset.boardIndex);
    const boardEvent = state.board_events?.[index];
    if (boardEvent?.kind === "wild" || boardEvent?.kind === "trainer") {
      mode = "combat";
    } else if (boardEvent?.kind === "normal_event" && boardEvent?.normal_event_id === "wounded_pokemon") {
      mode = "masters";
    } else {
      return;
    }
  } else {
    if (!battleNeedsGeneralData(state.battle)) return;
    mode = "masters";
  }

  // Stop the original synchronous preview listener before the first await.
  // Event propagation does not wait for async handlers on Safari.
  event.preventDefault();
  event.stopImmediatePropagation();
  const disabledBefore = button.disabled;
  button.disabled = true;
  activeGeneralLoadLabel = mode === "combat" ? "戦闘データを読み込んでいます…" : "ポケモンデータを読み込んでいます…";
  setCombatLoadingNotice(activeGeneralLoadLabel);
  try {
    const demand = await import("./runtime/safari-general-data-demand.js");
    if (mode === "combat") {
      if (!demand.safariGeneralCombatReady()) await demand.ensureSafariGeneralCombatData();
    } else if (!demand.safariGeneralDataReady()) {
      await demand.ensureSafariGeneralData();
    }
    button.disabled = disabledBefore;
    activeGeneralLoadLabel = null;
    replayingCombatClicks.add(button);
    button.click();
  } catch (error) {
    button.disabled = disabledBefore;
    activeGeneralLoadLabel = null;
    setCombatLoadingNotice("データの読み込みに失敗しました。もう一度お試しください。");
    console.error("[Mapless] demand load failed", error);
  }
}, { capture: true });

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
