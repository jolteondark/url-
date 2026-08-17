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
  notice(action === "continue"
    ? "つづきから開始します。マスを選ぶと保存データを読み込みます。"
    : "Day Boardを準備しました。マスを選んでください。");
}

function detachBootListeners() {
  newRun?.removeEventListener("click", onNewRun);
  continueRun?.removeEventListener("click", onContinueRun);
  board?.removeEventListener("click", onBootBoardChoice);
}

async function loadPreviewApp(boardIndex) {
  if (loading || !selectedAction) return;
  loading = true;
  notice("選択したマスを読み込んでいます…");
  if (!appPromise) appPromise = import("./preview-app.js");
  try {
    await appPromise;
    await import("./preview-board-start-bridge.js");
    detachBootListeners();
    window.dispatchEvent(new CustomEvent("safari-preview-start", {
      detail: { action: selectedAction, boardIndex },
    }));
  } catch (error) {
    loading = false;
    appPromise = null;
    notice("ゲームの読み込みに失敗しました。もう一度お試しください。");
    console.error("[Mapless] preview app load failed", error);
  }
}

function onNewRun() {
  armBoard("new");
}

function onContinueRun() {
  if (!hasStoredRun()) {
    notice("つづきから再開できるセーブがありません。");
    return;
  }
  armBoard("continue");
}

function onBootBoardChoice(event) {
  if (loading) return;
  const cell = event.target.closest("button[data-boot-board-index]");
  if (!cell) return;
  if (!selectedAction) {
    notice("先に新規またはつづきを選んでください。");
    return;
  }
  loadPreviewApp(Number(cell.dataset.bootBoardIndex));
}

newRun?.addEventListener("click", onNewRun);
continueRun?.addEventListener("click", onContinueRun);
board?.addEventListener("click", onBootBoardChoice);
setBootControls();
notice("新規またはつづきを押すと、すぐDay Boardを表示します。");
