const byId = (id) => document.getElementById(id);

function state() {
  return globalThis.__maplessSafariRuntime?.variables?.mapless ?? null;
}

function battle() {
  return state()?.battle ?? null;
}

function contextualizeReturn(current) {
  const button = byId("return-board");
  if (!button || current?.phase !== "RESULT") return;
  const target = current?.return_target ?? "day_board";
  button.textContent = target === "home" ? "ラン結果へ" : target === "village" ? "村へ戻る" : "Day Boardへ戻る";
  button.setAttribute("aria-label", button.textContent);
}

let pending = false;
function schedule() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    contextualizeReturn(battle());
  });
}

window.addEventListener("safari-runtime-changed", schedule, { passive:true });
window.addEventListener("safari-preview-start", schedule, { passive:true });
window.addEventListener("pageshow", schedule, { passive:true });
schedule();
