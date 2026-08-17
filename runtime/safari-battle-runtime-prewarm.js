import { prepareSafariBattleRuntime } from "./safari-web-playable-integration.js";

let scheduled = false;
let warming = false;

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

function prewarmAfterBattleRender() {
  if (!battleActive() || warming) return;
  warming = true;
  publishStage("runtime_prewarm_start");
  prepareSafariBattleRuntime()
    .then(() => {
      publishStage("runtime_prewarm_ready");
      if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
        window.dispatchEvent(new CustomEvent("safari-battle-runtime-ready"));
      }
    })
    .catch((error) => {
      globalThis.__maplessLastError = error;
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
