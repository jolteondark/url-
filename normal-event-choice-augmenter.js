const ownerModules = new Map();

function runtime() { return globalThis.__maplessSafariRuntime ?? null; }
function activeNormalEvent() {
  const active = globalThis.__maplessNormalEventUi ?? null;
  return active?.runtime === runtime() ? active : null;
}
function loadOwner(eventId) {
  if (!ownerModules.has(eventId)) {
    const specifier = {
      fake_nurse:"./runtime/safari-fake-nurse-interaction.js",
      burning_wagon:"./runtime/safari-burning-wagon-interaction.js",
    }[eventId];
    if (!specifier) return Promise.resolve(null);
    ownerModules.set(eventId, import(specifier));
  }
  return ownerModules.get(eventId);
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

async function augmentFakeNurse(active, current) {
  const actions = document.getElementById("normal-event-actions");
  if (!actions || actions.querySelector('[data-normal-event-action="check_id:heal"]')) return;
  const leave = actions.querySelector('[data-normal-event-action="leave"]');
  if (!leave) return;
  const owner = await loadOwner("fake_nurse");
  if (!owner || activeNormalEvent() !== active) return;
  actions.insertBefore(makeChoice("check_id:heal", "身分証を確認する", "本物なら半額で50%回復 · 偽物なら逃走またはトレーナー戦"), leave);
  actions.insertBefore(makeChoice("check_id:leave", "身分証だけ確認する", "本物なら治療を断る · 偽物なら正体を暴く", true), leave);
  if (owner.safariFakeNurseWarning(current, active.boardIndex)) {
    const message = document.getElementById("normal-event-message");
    if (message && activeNormalEvent() === active) message.textContent = "手持ちのあく/エスパータイプが違和感を覚えています。身分証を確認した方がよさそうです。";
  }
}

async function augmentBurningWagon(active, current) {
  const fireButton = document.querySelector('#normal-event-actions button[data-normal-event-action="fire"]');
  if (!fireButton) return;
  const owner = await loadOwner("burning_wagon");
  if (!owner || activeNormalEvent() !== active || !fireButton.isConnected) return;
  const choices = owner.safariBurningWagonFireChoices(current, active.boardIndex);
  const buttons = choices.map((itemId) => makeChoice(
    `fire:${itemId}`,
    `ほのおタイプで救助し、${itemId}を受け取る`,
    "canonical候補から1個",
  ));
  buttons.push(makeChoice("fire:none", "ほのおタイプで救助し、お礼は受け取らない", "報酬なし", true));
  if (activeNormalEvent() !== active || !fireButton.isConnected) return;
  fireButton.replaceWith(...buttons);
}

async function reconcile() {
  const active = activeNormalEvent();
  const current = runtime();
  if (!active || !current) return;
  if (active.eventId === "fake_nurse") await augmentFakeNurse(active, current);
  else if (active.eventId === "burning_wagon") await augmentBurningWagon(active, current);
}
function scheduleReconcile() {
  reconcile().catch((error) => {
    globalThis.__maplessLastError = error;
    console.error("[Mapless] normal-event choice augmentation failed", error);
  });
}

window.addEventListener("safari-normal-event-rendered", scheduleReconcile, { passive:true });
window.addEventListener("pageshow", scheduleReconcile, { passive:true });
scheduleReconcile();
