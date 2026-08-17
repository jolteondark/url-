let scheduled = false;
let warming = false;
let facadePromise = null;

function battleActive() {
  const battle = globalThis.__maplessSafariRuntime?.variables?.mapless?.battle;
  return Boolean(battle && !battle.completed);
}

function publishStage(stage, error = null) {
  globalThis.__maplessBattleRuntimePrewarmTrace = {
    stage,
    error_name: error?.name ?? null,
    error_message: error?.message ?? null,
  };
}

function prepareBattleRuntimeModule() {
  if (!facadePromise) {
    facadePromise = import("./safari-web-playable-integration.js?v=20260818-0800").catch((error) => {
      facadePromise = null;
      throw error;
    });
  }
  return facadePromise.then((facade) => facade.prepareSafariBattleRuntime(globalThis.__maplessSafariRuntime));
}

function prewarmAfterBattleRender() {
  if (!battleActive() || warming) return;
  warming = true;
  publishStage("runtime_prewarm_start");
  prepareBattleRuntimeModule()
    .then(() => {
      publishStage("runtime_prewarm_ready");
      if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
        window.dispatchEvent(new CustomEvent("safari-battle-runtime-ready"));
      }
    })
    .catch((error) => {
      globalThis.__maplessLastError = error;
      globalThis.__maplessBattleRuntimeError = error;
      publishStage("runtime_prewarm_error", error);
      if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
        window.dispatchEvent(new CustomEvent("safari-battle-runtime-error", { detail: { error } }));
      }
    })
    .finally(() => {
      warming = false;
    });
}

function schedulePrewarm() {
  if (!battleActive() || scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    prewarmAfterBattleRender();
  });
}

window.addEventListener("safari-runtime-changed", schedulePrewarm, { passive: true });
window.addEventListener("pageshow", schedulePrewarm, { passive: true });
schedulePrewarm();
