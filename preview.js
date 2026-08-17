let appPromise = null;
let selectedAction = null;
let loading = false;

const SAVE_KEY = "mapless.safari.playable.v4";
const byId = (id) => document.getElementById(id);
const board = byId("board");
const newRun = byId("new-run");
const continueRun = byId("continue-run");

function traceBattleStart(stage, detail = {}) {
  const trace = Array.isArray(globalThis.__maplessBattleStartLifecycleTrace)
    ? globalThis.__maplessBattleStartLifecycleTrace
    : [];
  trace.push(Object.freeze({ stage, ...detail }));
  globalThis.__maplessBattleStartLifecycleTrace = trace;
}

function notice(text) {
  const node = byId("notice");
  if (node) node.textContent = text;
}

function hasStoredRun() {
  try { return window.localStorage.getItem(SAVE_KEY) !== null; }
  catch (_) { return false; }
}

function setBootControls() {
  if (continueRun) continueRun.disabled = !hasStoredRun();
  const saveRun = byId("save-run");
  if (saveRun) saveRun.disabled = true;
}

function armBoard(action) {
  selectedAction = action;
  if (board) {
    [...board.querySelectorAll("button")].forEach((button, index) => {
      button.type = "button";
      button.disabled = false;
      button.className = "board-cell";
      button.dataset.bootBoardIndex = String(index);
      delete button.dataset.boardIndex;
      button.replaceChildren();
      const number = document.createElement("span");
      number.className = "cell-number";
      number.textContent = String(index + 1);
      const label = document.createElement("strong");
      label.textContent = "？？？";
      button.append(number, label);
    });
  }
  if (byId("mode")) byId("mode").textContent = "探索";
  notice(selectedAction === "continue"
    ? "つづきから開始します。マスを選ぶと保存データを読み込みます。"
    : "Day Boardを準備しました。マスを選んでください。");
}

function detachBootListeners() {
  newRun?.removeEventListener("click", onNewRun);
  continueRun?.removeEventListener("click", onContinueRun);
  board?.removeEventListener("click", onBootBoardChoice);
}

function nextFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(resolve));
}

async function ensureInitialSceneHandoff(state) {
  traceBattleStart("scene_handoff_dispatch", { hasBattle: Boolean(state.battle) });
  window.dispatchEvent(new CustomEvent("safari-runtime-changed"));
  await nextFrame();

  if (!state.battle) return;
  const card = byId("battle-card");
  const moves = byId("moves");
  let trace = {
    battleState: true,
    sceneVisible: Boolean(card && !card.hidden),
    moveButtonCount: moves?.querySelectorAll("button[data-move-id]").length ?? 0,
    pageshowFallbackUsed: false,
  };
  traceBattleStart("scene_handoff_frame", trace);

  if (!trace.sceneVisible || trace.moveButtonCount === 0) {
    trace.pageshowFallbackUsed = true;
    traceBattleStart("scene_pageshow_fallback", trace);
    window.dispatchEvent(new Event("pageshow"));
    await nextFrame();
    trace = {
      ...trace,
      sceneVisible: Boolean(card && !card.hidden),
      moveButtonCount: moves?.querySelectorAll("button[data-move-id]").length ?? 0,
    };
    traceBattleStart("scene_pageshow_frame", trace);
  }

  globalThis.__maplessBattleStartTrace = trace;
  if (!trace.sceneVisible) {
    throw new Error("Battle state created but Battle scene did not become visible");
  }
  if (trace.moveButtonCount === 0) {
    throw new Error("Battle state created but no move buttons were rendered");
  }
  traceBattleStart("scene_handoff_ready", trace);
}

async function activateInitialBoardChoice(index) {
  traceBattleStart("combat_entry_import_start", { index });
  const { activateSafariDayBoardCell } = await import("./runtime/safari-web-playable-integration.js");
  traceBattleStart("combat_entry_import_ready", { index });
  const runtime = globalThis.__maplessSafariRuntime;
  const state = runtime?.variables?.mapless;
  if (!state) throw new Error("Safari runtime unavailable after preview start");
  const cell = state.board_events?.[index];
  traceBattleStart("board_owner_start", { index, kind: cell?.kind ?? null });

  if (cell?.kind === "normal_event" && cell.normal_event_id === "wounded_pokemon") {
    const general = await import("./runtime/safari-general-data-demand.js");
    if (!general.safariGeneralDataReady()) await general.ensureSafariGeneralData();
  }

  await activateSafariDayBoardCell(runtime, index);
  traceBattleStart("board_owner_ready", { index, hasBattle: Boolean(state.battle) });
  await ensureInitialSceneHandoff(state);
  const target = state.battle ? byId("battle-card") : state.shop ? byId("shop-card") : null;
  if (target) window.setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
}

async function loadPreviewApp(boardIndex) {
  if (loading || !selectedAction) return;
  loading = true;
  globalThis.__maplessBattleStartLifecycleTrace = [];
  traceBattleStart("board_click", { boardIndex, action: selectedAction });
  notice("選択したマスを読み込んでいます…");
  if (!appPromise) {
    traceBattleStart("preview_app_import_start");
    appPromise = import("./preview-app.js");
  }
  try {
    await appPromise;
    traceBattleStart("preview_app_import_ready");
    window.dispatchEvent(new CustomEvent("safari-preview-start", { detail: { action: selectedAction } }));
    traceBattleStart("preview_start_dispatched", {
      runtimeReady: Boolean(globalThis.__maplessSafariRuntime?.variables?.mapless),
    });
    await activateInitialBoardChoice(boardIndex);
    traceBattleStart("initial_board_activation_ready");
    detachBootListeners();
  } catch (error) {
    traceBattleStart("initial_board_activation_error", {
      error_name: error?.name ?? "Error",
      error_message: error?.message ?? String(error),
    });
    loading = false;
    appPromise = null;
    globalThis.__maplessLastError = error;
    const failedAction = selectedAction;
    armBoard(failedAction);
    notice("ゲームの読み込みに失敗しました: " + (error?.message ?? error) + "。マスを選び直せます。");
    console.error("[Mapless] preview app load failed", error);
  }
}

function onNewRun() { armBoard("new"); }
function onContinueRun() {
  if (!hasStoredRun()) return notice("つづきから再開できるセーブがありません。");
  armBoard("continue");
}
function onBootBoardChoice(event) {
  if (loading) return;
  const cell = event.target.closest("button[data-boot-board-index]");
  if (!cell) return;
  if (!selectedAction) return notice("先に新規またはつづきを選んでください。");
  loadPreviewApp(Number(cell.dataset.bootBoardIndex));
}

newRun?.addEventListener("click", onNewRun);
continueRun?.addEventListener("click", onContinueRun);
board?.addEventListener("click", onBootBoardChoice);
setBootControls();
notice("新規またはつづきを押すと、すぐDay Boardを表示します。");