import { installSafariEggHatchVisitBridgeV108 } from "./runtime/safari-egg-hatch-visits-v108.js";
import { installCanonicalBattleUiAssets } from "./runtime/canonical-battle-ui-assets.js?v=20260906-0100";
import { installCanonicalBattleBattlerAssets } from "./runtime/canonical-battle-battler-assets.js?v=20260906-0500";
import { rememberCanonicalBattlebackDiagnostic } from "./runtime/canonical-battleback-assets.js?v=20260906-0000";

let appPromise = null;
let replacementPresentationPromise = null;
let carryoverPresentationPromise = null;
let loading = false;

const SAVE_KEY = "mapless.safari.playable.v4";
const byId = (id) => document.getElementById(id);
const newRun = byId("new-run");
const continueRun = byId("continue-run");

function installCanonicalBattlebackFailClosedState() {
  const card = byId("battle-card");
  if (!card) return;
  card.dataset.canonicalBattleback = "unavailable";
  rememberCanonicalBattlebackDiagnostic(null, "unavailable", "missing_owner_time_of_day");
}

function traceBattleStart(stage, detail = {}) {
  const trace = Array.isArray(globalThis.__maplessBattleStartLifecycleTrace)
    ? globalThis.__maplessBattleStartLifecycleTrace
    : [];
  trace.push(Object.freeze({ stage, ...detail }));
  globalThis.__maplessBattleStartLifecycleTrace = trace;
}

function captureBattleRenderError(event) {
  const state = globalThis.__maplessSafariRuntime?.variables?.mapless;
  if (!state?.battle || !(event?.error instanceof Error)) return;
  globalThis.__maplessLastError = event.error;
  traceBattleStart("scene_render_error", {
    error_name: event.error.name,
    error_message: event.error.message,
  });
}

function rememberPreviewStartError(error) {
  const exact = error instanceof Error ? error : new Error(String(error));
  const state = globalThis.__maplessSafariRuntime?.variables?.mapless ?? null;
  if (state?.mapless_carryover_pending && state.location === "home" && exact.state == null) {
    exact.state = typeof structuredClone === "function" ? structuredClone(state) : { ...state };
  }
  globalThis.__maplessLastError = exact;
  return exact;
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

function detachBootListeners() {
  newRun?.removeEventListener("click", onNewRun);
  continueRun?.removeEventListener("click", onContinueRun);
}

function traceSceneAfterRuntimeChange() {
  window.requestAnimationFrame(() => {
    const state = globalThis.__maplessSafariRuntime?.variables?.mapless;
    if (!state?.battle) return;
    const card = byId("battle-card");
    const moves = byId("moves");
    const trace = {
      battleState: true,
      sceneVisible: Boolean(card && !card.hidden),
      moveButtonCount: moves?.querySelectorAll("button[data-move-id]").length ?? 0,
    };
    globalThis.__maplessBattleStartTrace = trace;
    traceBattleStart("scene_handoff_frame", trace);
    if (trace.sceneVisible && trace.moveButtonCount > 0) traceBattleStart("scene_handoff_ready", trace);
  });
}

async function startPreview(action) {
  if (loading) return;
  loading = true;
  globalThis.__maplessBattleStartLifecycleTrace = [];
  traceBattleStart("preview_start_request", { action });
  notice(action === "continue" ? "保存データを読み込んでいます…" : "Day Boardを準備しています…");
  if (!appPromise) {
    traceBattleStart("preview_app_import_start");
    appPromise = import("./preview-app.js?v=20260825-0815");
  }
  try {
    await appPromise;
    replacementPresentationPromise ??= import("./battle-player-replacement-presentation.js?v=20260822-2035");
    carryoverPresentationPromise ??= import("./carryover-next-run-presentation.js?v=20260820-0531");
    const [, carryoverPresentation] = await Promise.all([
      replacementPresentationPromise,
      carryoverPresentationPromise,
    ]);
    traceBattleStart("preview_app_import_ready");
    window.dispatchEvent(new CustomEvent("safari-preview-start", { detail: { action } }));
    await carryoverPresentation.renderSafariCarryoverSelection?.();
    traceBattleStart("preview_start_dispatched", {
      runtimeReady: Boolean(globalThis.__maplessSafariRuntime?.variables?.mapless),
      carryoverPending: Boolean(globalThis.__maplessSafariRuntime?.variables?.mapless?.mapless_carryover_pending),
      carryoverLocation: globalThis.__maplessSafariRuntime?.variables?.mapless?.location ?? null,
      carryoverPanelVisible: Boolean(byId("carryover-next-run-panel")),
      carryoverError: globalThis.__maplessLastError?.message ?? null,
    });
    detachBootListeners();
    traceBattleStart("preview_ready_for_board_click");
  } catch (error) {
    traceBattleStart("preview_start_error", {
      error_name: error?.name ?? "Error",
      error_message: error?.message ?? String(error),
    });
    loading = false;
    appPromise = null;
    replacementPresentationPromise = null;
    carryoverPresentationPromise = null;
    const diagnosed = rememberPreviewStartError(error);
    notice("ゲームの読み込みに失敗しました: " + diagnosed.message + "。もう一度開始できます。");
    console.error("[Mapless] preview app load failed", diagnosed);
  }
}

async function onNewRun() {
  if (hasStoredRun()) {
    try {
      const { loadSafariPlayableRun } = await import("./runtime/safari-web-startup.js");
      const loaded = loadSafariPlayableRun(window.localStorage);
      if (loaded.found && loaded.state?.variables?.mapless?.mapless_carryover_pending) {
        notice("ラン終了。次ランの持ち込み選択待ちです。");
        return startPreview("continue");
      }
    } catch (error) {
      globalThis.__maplessLastError = error;
      console.error("[Mapless] carryover save probe failed", error);
    }
  }
  return startPreview("new");
}
function onContinueRun() {
  if (!hasStoredRun()) return notice("つづきから再開できるセーブがありません。");
  startPreview("continue");
}

installSafariEggHatchVisitBridgeV108();
installCanonicalBattlebackFailClosedState();
installCanonicalBattleBattlerAssets();
installCanonicalBattleUiAssets().catch((error) => {
  console.error("[Mapless] canonical Battle UI assets unavailable", error);
});
window.addEventListener("error", captureBattleRenderError);
window.addEventListener("safari-runtime-changed", traceSceneAfterRuntimeChange);
newRun?.addEventListener("click", onNewRun);
continueRun?.addEventListener("click", onContinueRun);
setBootControls();
notice("新規またはつづきを押すと、実際のDay Boardを読み込みます。");