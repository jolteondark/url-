import { safariFakeNurseWarning } from "./runtime/safari-fake-nurse-interaction.js";

function runtime() { return globalThis.__maplessSafariRuntime ?? null; }
function activeFakeNurse() {
  const active = globalThis.__maplessNormalEventUi ?? null;
  return active?.runtime === runtime() && active?.eventId === "fake_nurse" ? active : null;
}
function button(action, label, meta, secondary = false) {
  const node = document.createElement("button");
  node.type = "button";
  node.dataset.normalEventAction = action;
  node.className = secondary ? "secondary normal-event-choice" : "normal-event-choice";
  const title = document.createElement("strong");
  title.textContent = label;
  node.append(title);
  if (meta) {
    const detail = document.createElement("small");
    detail.textContent = meta;
    node.append(detail);
  }
  return node;
}
function enhance() {
  const active = activeFakeNurse();
  const current = runtime();
  if (!active || !current) return;
  const actions = document.getElementById("normal-event-actions");
  if (!actions || actions.querySelector('[data-normal-event-action="check_id:heal"]')) return;
  const leave = actions.querySelector('[data-normal-event-action="leave"]');
  const heal = button("check_id:heal", "身分証を確認する", "本物なら半額で50%回復 · 偽物なら逃走またはトレーナー戦");
  const decline = button("check_id:leave", "身分証だけ確認する", "本物なら治療を断る · 偽物なら正体を暴く", true);
  actions.insertBefore(heal, leave);
  actions.insertBefore(decline, leave);
  if (safariFakeNurseWarning(current, active.boardIndex)) {
    const message = document.getElementById("normal-event-message");
    if (message) message.textContent = "手持ちのあく/エスパータイプが違和感を覚えています。身分証を確認した方がよさそうです。";
  }
}

window.addEventListener("safari-normal-event-rendered", enhance, { passive:true });
window.addEventListener("pageshow", enhance, { passive:true });
