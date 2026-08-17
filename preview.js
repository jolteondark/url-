let appPromise = null;
let selectedAction = null;
let loading = false;

const SAVE_KEY = "mapless.safari.playable.v4";
const byId = (id) => document.getElementById(id);
const board = byId("board");
const newRun = byId("new-run");
const continueRun = byId("continue-run");

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

async function activateInitialBoardChoice(index) {
  const [{ activateSafariDayBoardCell }, general] = await Promise.all([
    import("./runtime/safari-web-playable-integration.js"),
    import("./runtime/safari-general-data-demand.js"),
  ]);
  const runtime = globalThis.__maplessSafariRuntime;
  const state = runtime?.variables?.mapless;
  if (!state) throw new Error("Safari runtime unavailable after preview start");
  const cell = state.board_events?.[index];
  if ((cell?.kind === "wild" || cell?.kind === "trainer") && !general.safariGeneralCombatReady()) {
    await general.ensureSafariGeneralCombatData();
  } else if (cell?.kind === "normal_event" && cell.normal_event_id === "wounded_pokemon" && !general.safariGeneralDataReady()) {
    await general.ensureSafariGeneralData();
  }
  await activateSafariDayBoardCell(runtime, index);
  window.dispatchEvent(new Event("pageshow"));
  window.dispatchEvent(new CustomEvent("safari-runtime-changed"));
  const target = state.battle ? byId("battle-card") : state.shop ? byId("shop-card") : null;
  if (target) window.setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
}

async function loadPreviewApp(boardIndex) {
  if (loading || !selectedAction) return;
  loading = true;
  notice("選択したマスを読み込んでいます…");
  if (!appPromise) appPromise = import("./preview-app.js");
  try {
    await appPromise;
    detachBootListeners();
    window.dispatchEvent(new CustomEvent("safari-preview-start", { detail: { action: selectedAction } }));
    await activateInitialBoardChoice(boardIndex);
  } catch (error) {
    loading = false;
    appPromise = null;
    notice("ゲームの読み込みに失敗しました。もう一度お試しください。");
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
