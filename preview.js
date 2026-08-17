let appPromise = null;
let requestedAction = null;

const byId = (id) => document.getElementById(id);

function notice(text) {
  const node = byId("notice");
  if (node) node.textContent = text;
}

function setStartButtonsDisabled(disabled) {
  const newRun = byId("new-run");
  const continueRun = byId("continue-run");
  if (newRun) newRun.disabled = disabled;
  if (continueRun) continueRun.disabled = disabled;
}

async function loadPreviewApp(action) {
  if (requestedAction) return;
  requestedAction = action;
  setStartButtonsDisabled(true);
  notice("ゲームを読み込んでいます…");
  if (!appPromise) appPromise = import("./preview-app.js");
  try {
    await appPromise;
    document.removeEventListener("click", interceptStart, true);
    window.dispatchEvent(new CustomEvent("safari-preview-start", { detail: { action } }));
  } catch (error) {
    requestedAction = null;
    appPromise = null;
    setStartButtonsDisabled(false);
    notice("ゲームの読み込みに失敗しました。もう一度お試しください。");
    console.error("[Mapless] preview app load failed", error);
  }
}

function interceptStart(event) {
  const button = event.target.closest("#new-run,#continue-run");
  if (!button || requestedAction) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  loadPreviewApp(button.id === "continue-run" ? "continue" : "new");
}

document.addEventListener("click", interceptStart, true);
notice("新規またはつづきを押すとゲームを開始します。");
