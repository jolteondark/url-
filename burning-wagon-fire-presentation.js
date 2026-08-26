let ownerPromise = null;

function activeBurningWagon() {
  const active = globalThis.__maplessNormalEventUi ?? null;
  const runtime = globalThis.__maplessSafariRuntime ?? null;
  if (!active || active.eventId !== "burning_wagon" || active.runtime !== runtime) return null;
  return { active, runtime };
}

function makeChoice(action, label, meta, secondary = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.normalEventAction = action;
  button.className = secondary ? "secondary normal-event-choice" : "normal-event-choice";
  const title = document.createElement("strong");
  title.textContent = label;
  button.append(title);
  if (meta) {
    const note = document.createElement("small");
    note.textContent = meta;
    button.append(note);
  }
  return button;
}

async function expandFireChoice() {
  const context = activeBurningWagon();
  if (!context) return;
  const fireButton = document.querySelector('#normal-event-actions button[data-normal-event-action="fire"]');
  if (!fireButton) return;

  ownerPromise ??= import("./runtime/safari-burning-wagon-interaction.js");
  const owner = await ownerPromise;
  const current = activeBurningWagon();
  if (!current || current.runtime !== context.runtime || current.active.boardIndex !== context.active.boardIndex) return;

  const choices = owner.safariBurningWagonFireChoices(context.runtime, context.active.boardIndex);
  const buttons = choices.map((itemId) => makeChoice(
    `fire:${itemId}`,
    `ほのおタイプで救助し、${itemId}を受け取る`,
    "canonical候補から1個",
  ));
  buttons.push(makeChoice("fire:none", "ほのおタイプで救助し、お礼は受け取らない", "報酬なし", true));
  fireButton.replaceWith(...buttons);
}

window.addEventListener("safari-normal-event-rendered", () => {
  expandFireChoice().catch((error) => {
    globalThis.__maplessLastError = error;
    console.error("[Mapless] Burning Wagon FIRE choice presentation failed", error);
  });
}, { passive:true });
