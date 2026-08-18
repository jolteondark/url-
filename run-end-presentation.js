import { saveSafariPlayableRun } from "./runtime/safari-web-startup.js";

const byId = (id) => document.getElementById(id);
const savedHomeRuntimes = new WeakSet();

function runtimeState() {
  const runtime = globalThis.__maplessSafariRuntime;
  const state = runtime?.variables?.mapless;
  return runtime && state ? { runtime, state } : null;
}

function carryoverPending() {
  const current = runtimeState();
  return Boolean(current?.state.mapless_carryover_pending);
}

function persistFinishedRun(current) {
  if (!current || current.state.location !== "home" || !current.state.mapless_carryover_pending) return;
  if (savedHomeRuntimes.has(current.runtime)) return;
  const requested = (current.state.last_operations ?? []).some((operation) => operation?.op === "request_save");
  if (!requested) return;
  try {
    saveSafariPlayableRun(window.localStorage, current.runtime);
    savedHomeRuntimes.add(current.runtime);
  } catch (error) {
    globalThis.__maplessLastError = error;
    console.error("[Mapless] run-end auto-save failed", error);
  }
}

export function syncRunEndPresentation() {
  const current = runtimeState();
  if (!current) return;
  const { state } = current;
  const home = state.location === "home" || state.mapless_carryover_pending;

  const boardTitle = byId("board-card")?.querySelector("h2");
  if (boardTitle) boardTitle.textContent = home ? "Run End" : "Day Board";
  const mode = byId("mode");
  if (mode && home && !state.battle) mode.textContent = "ラン終了";

  const newRun = byId("new-run");
  if (newRun) {
    if (state.mapless_carryover_pending) {
      newRun.disabled = true;
      newRun.title = "次ランの持ち込み選択待ちです";
    } else {
      newRun.removeAttribute("title");
    }
  }

  const returnButton = byId("return-board");
  if (returnButton && state.battle?.completed && state.battle.return_target === "home") {
    returnButton.textContent = "ホームへ";
  }

  persistFinishedRun(current);
}

function scheduleSettledSync(delay = 0) {
  window.setTimeout(syncRunEndPresentation, delay);
}

document.addEventListener("click", (event) => {
  const newRun = event.target.closest?.("#new-run");
  if (newRun && carryoverPending()) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const notice = byId("notice");
    if (notice) notice.textContent = "ラン終了。次ランの持ち込み選択待ちです。";
    syncRunEndPresentation();
    return;
  }

  if (event.target.closest?.("#return-board")) {
    // The normal handler awaits a synchronous domain transition. A zero-delay
    // task runs after its Promise continuation/render and persists the home state.
    scheduleSettledSync(0);
    return;
  }

  if (event.target.closest?.("#moves, #capture, #flee")) {
    // Battle presentation intentionally animates before its final render.
    // Re-check only presentation text; mechanics/state stay owned by Battle.
    scheduleSettledSync(400);
    scheduleSettledSync(1000);
  }
}, true);

window.addEventListener("safari-runtime-changed", syncRunEndPresentation);
window.addEventListener("pageshow", syncRunEndPresentation);
syncRunEndPresentation();
