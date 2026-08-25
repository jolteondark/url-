const OWNER_URL = "./runtime/safari-traveling-cook-interaction.js?v=20260825-2200";
let resolvingPowerMeal = false;

function runtime() { return globalThis.__maplessSafariRuntime ?? null; }
function state() { return runtime()?.variables?.mapless ?? null; }
function activeCook() {
  const active = globalThis.__maplessNormalEventUi ?? null;
  return active?.runtime === runtime() && active?.eventId === "traveling_cook" ? active : null;
}
function berryCount(current) {
  return (current?.bag?.slots ?? [])
    .filter((slot) => Array.isArray(slot) && /BERRY$/i.test(String(slot[0] ?? "")))
    .reduce((sum, slot) => sum + Math.max(0, Math.trunc(Number(slot[1]) || 0)), 0);
}
function price() {
  const day = Math.max(1, Number(state()?.day) || 1);
  return 600 + Math.max(Math.floor((day - 1) / 5), 0) * 100;
}
function button(action, label, meta, disabled = false) {
  const element = document.createElement("button");
  element.type = "button";
  element.dataset.normalEventAction = action;
  element.dataset.travelingCookPower = "true";
  element.className = "normal-event-choice";
  element.disabled = disabled || resolvingPowerMeal;
  const title = document.createElement("strong");
  title.textContent = label;
  element.append(title);
  const detail = document.createElement("small");
  detail.textContent = meta;
  element.append(detail);
  return element;
}
function installPowerChoices() {
  const active = activeCook();
  const current = runtime();
  const container = document.getElementById("normal-event-actions");
  if (!active || !current || !container) return;
  if (container.querySelector('[data-normal-event-action="pay:power"]')) return;

  const count = berryCount(current);
  const prototype = container.querySelector('[data-normal-event-action="prototype"]');
  const paid = button("pay:power", "力の料理をお金で頼む", `${price()}円 · 今日の次の3戦で先頭の攻撃/特攻+1`);
  const berries = button("berries:power", "きのみ3個で力の料理", `所持きのみ ${count}個 · 今日の次の3戦で先頭の攻撃/特攻+1`, count < 3);
  if (prototype) {
    container.insertBefore(paid, prototype);
    container.insertBefore(berries, prototype);
  } else {
    container.append(paid, berries);
  }
}

window.addEventListener("safari-normal-event-rendered", installPowerChoices, { passive:true });
window.addEventListener("safari-runtime-changed", () => queueMicrotask(installPowerChoices), { passive:true });

document.addEventListener("click", async (event) => {
  const target = event.target.closest('button[data-traveling-cook-power="true"]');
  if (!target || resolvingPowerMeal) return;
  const active = activeCook();
  const current = runtime();
  if (!active || !current) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  resolvingPowerMeal = true;
  for (const choice of document.querySelectorAll("#normal-event-actions button")) choice.disabled = true;
  try {
    const owner = await import(OWNER_URL);
    const actionId = String(target.dataset.normalEventAction ?? "");
    const action = actionId.startsWith("berries:") ? "berries" : "pay";
    const result = await owner.resolveSafariTravelingCookInteraction(current, active.boardIndex, action, "power");
    if (result.persistenceRequested || result.operations?.some((operation) => operation?.op === "request_save")) {
      const startup = await import("./runtime/safari-web-startup.js");
      startup.saveSafariPlayableRun(window.localStorage, current);
    }
    if (result.completed) globalThis.__maplessNormalEventUi = null;
    window.dispatchEvent(new CustomEvent("safari-runtime-changed"));
  } catch (error) {
    globalThis.__maplessLastError = error;
    if (state()) state().notice = `イベントエラー: ${error?.message ?? error}`;
    window.dispatchEvent(new CustomEvent("safari-runtime-changed"));
  } finally {
    resolvingPowerMeal = false;
    queueMicrotask(installPowerChoices);
  }
}, true);
