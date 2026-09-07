function runtime() { return globalThis.__maplessSafariRuntime ?? null; }
function activeCook() {
  const active = globalThis.__maplessNormalEventUi ?? null;
  return active?.runtime === runtime() && active?.eventId === "traveling_cook" ? active : null;
}

function addPowerChoice(container, action, label) {
  if (container.querySelector(`[data-normal-event-action="${action}"]`)) return;
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.normalEventAction = action;
  button.dataset.travelingCookPower = "true";
  button.className = "normal-event-choice";
  const title = document.createElement("strong");
  title.textContent = label;
  button.append(title);
  const prototype = container.querySelector('[data-normal-event-action="prototype"]');
  if (prototype) container.insertBefore(button, prototype);
  else container.append(button);
}

function installPowerChoices() {
  if (!activeCook()) return;
  const container = document.getElementById("normal-event-actions");
  if (!container) return;
  addPowerChoice(container, "pay:power", "力の料理をお金で頼む");
  addPowerChoice(container, "berries:power", "きのみ3個で力の料理");
}

// Presentation only exposes owner-recognized UI intents. The shared normal-event
// presentation owns click dispatch and persistence; canonical Traveling Cook
// owners remain authoritative for price, berry availability, outcome, mutation,
// power-meal mechanics, and request_save.
window.addEventListener("safari-normal-event-rendered", installPowerChoices, { passive:true });
window.addEventListener("safari-runtime-changed", () => queueMicrotask(installPowerChoices), { passive:true });
