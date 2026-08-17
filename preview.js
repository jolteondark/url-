let appPromise = null;
let selectedAction = null;
let loading = false;

const SAVE_KEY = "mapless.safari.playable.v4";
const byId = (id) => document.getElementById(id);

function notice(text) {
  const node = byId("notice");
  if (node) node.textContent = text;
}

function hasStoredRun() {
  try { return window.localStorage.getItem(SAVE_KEY) !== null; }
  catch (_) { return false; }
}

function setBootControls() {
  const continueRun = byId("continue-run");
  if (continueRun) continueRun.disabled = !hasStoredRun();
  const saveRun = byId("save-run");
  if (saveRun) saveRun.disabled = true;
}

function armBoard(action) {
  selectedAction = action;
  const board = byId("board");
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

async function loadPreviewApp(boardIndex) {
  if (loading || !selectedAction) return;
  loading = true;
  notice("選択したマスを読み込んでいます…");
  if (!appPromise) appPromise = import("./preview-app.js");
  try {
    await appPromise;
    document.removeEventListener("click", interceptBoot, true);
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

function interceptBoot(event) {
  if (loading) return;
  const start = event.target.closest("#new-run,#continue-run");
  if (start) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const action = start.id === "continue-run" ? "continue" : "new";
    if (action === "continue" && !hasStoredRun()) {
      notice("つづきから再開できるセーブがありません。");
      return;
    }
    armBoard(action);
    return;
  }

  const cell = event.target.closest("#board button[data-boot-board-index]");
  if (!cell) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (!selectedAction) {
    notice("先に新規またはつづきを選んでください。");
    return;
  }
  loadPreviewApp(Number(cell.dataset.bootBoardIndex));
}

document.addEventListener("click", interceptBoot, true);
setBootControls();
notice("新規またはつづきを押すと、すぐDay Boardを表示します。");
