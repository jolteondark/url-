let startPromise = null;
let replaying = false;
let selectedStart = null;

const SAVE_KEY = "mapless.safari.playable.v4";
const START_BUTTONS = Object.freeze({
  "new-run": "new",
  "continue-run": "continue",
});
const GAMEPLAY_SELECTOR = "#enter-village,#menu-party,#menu-bag,#menu-box,#board button[data-boot-board-index]";

function byId(id) {
  return document.getElementById(id);
}

function notice(text) {
  const node = byId("notice");
  if (node) node.textContent = text;
}

function hasStoredRun() {
  try { return window.localStorage.getItem(SAVE_KEY) !== null; }
  catch (_) { return false; }
}

function armLightweightBoard(mode) {
  selectedStart = mode;
  const board = byId("board");
  if (board) {
    [...board.querySelectorAll("button")].forEach((button, index) => {
      button.type = "button";
      button.disabled = false;
      button.dataset.bootBoardIndex = String(index);
      button.className = "board-cell";
      button.replaceChildren();
      const number = document.createElement("span");
      number.className = "cell-number";
      number.textContent = String(index + 1);
      const label = document.createElement("strong");
      label.textContent = "？？？";
      button.append(number, label);
    });
  }
  const save = byId("save-run");
  if (save) save.disabled = true;
  notice(mode === "continue"
    ? "つづきから開始します。マスを選ぶと保存データを読み込みます。"
    : "Day Boardを準備しました。マスを選んでください。");
}

function setBootControls() {
  const continueButton = byId("continue-run");
  if (continueButton) continueButton.disabled = !hasStoredRun();
  const save = byId("save-run");
  if (save) save.disabled = true;
}

function replayAfterRuntime(triggerInfo) {
  if (!selectedStart || replaying) return;
  replaying = true;
  requestAnimationFrame(() => {
    try {
      byId(selectedStart === "continue" ? "continue-run" : "new-run")?.click();
      if (triggerInfo?.kind === "board") {
        document.querySelector(`#board button[data-board-index="${triggerInfo.index}"]`)?.click();
      } else if (triggerInfo?.selector) {
        document.querySelector(triggerInfo.selector)?.click();
      }
    } finally {
      replaying = false;
    }
  });
}

async function startRuntime(triggerInfo) {
  if (!startPromise) {
    notice("選択した場面を読み込んでいます…");
    startPromise = import("./preview.js")
      .then(() => import("./deferred-ui-loader.js"))
      .catch((error) => {
        startPromise = null;
        notice("ゲームの読み込みに失敗しました。もう一度お試しください。");
        console.error("[Mapless] gameplay bootstrap failed", error);
        throw error;
      });
  }
  await startPromise;
  replayAfterRuntime(triggerInfo);
}

document.addEventListener("click", (event) => {
  if (replaying) return;

  const startButton = event.target.closest("#new-run,#continue-run");
  if (startButton && !startPromise) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const mode = START_BUTTONS[startButton.id];
    if (mode === "continue" && !hasStoredRun()) {
      notice("つづきから再開できるセーブがありません。");
      return;
    }
    armLightweightBoard(mode);
    return;
  }

  if (startPromise) return;
  const trigger = event.target.closest(GAMEPLAY_SELECTOR);
  if (!trigger) return;
  event.preventDefault();
  event.stopImmediatePropagation();

  if (!selectedStart) {
    notice("先に新規またはつづきを選んでください。");
    return;
  }

  const bootIndex = trigger.dataset.bootBoardIndex;
  const triggerInfo = bootIndex !== undefined
    ? { kind: "board", index: Number(bootIndex) }
    : { kind: "control", selector: `#${trigger.id}` };
  startRuntime(triggerInfo);
}, true);

setBootControls();
notice("新規またはつづきを押すと、すぐDay Boardを表示します。");
