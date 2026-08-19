const byId = (id) => document.getElementById(id);
let scheduled = false;

function battle() {
  return globalThis.__maplessSafariRuntime?.variables?.mapless?.battle ?? null;
}

function movePp(button) {
  const text = button.querySelector("small")?.textContent ?? "";
  const match = text.match(/PP\s+(\d+)/);
  return match ? Number(match[1]) : 1;
}

function applyCommandUnlock() {
  scheduled = false;
  const current = battle();
  if (!current || current.phase !== "COMMAND" || current.completed || current.player_replacement_required) return;

  const moves = byId("moves");
  if (moves) {
    moves.inert = false;
    for (const button of moves.querySelectorAll("button[data-move-id]")) {
      button.disabled = movePp(button) <= 0;
    }
  }

  const capture = byId("capture");
  if (capture) {
    capture.inert = false;
    capture.hidden = current.kind !== "wild";
    capture.disabled = current.kind !== "wild";
  }

  const flee = byId("flee");
  if (flee) {
    const canFlee = current.kind === "wild" && current.origin !== "village_bounty";
    flee.inert = false;
    flee.hidden = false;
    flee.disabled = !canFlee;
    flee.textContent = canFlee ? "にげる" : "にげられない";
  }

  const panel = byId("battle-card")?.querySelector(".battle-command-panel");
  if (panel) panel.dataset.turnPhaseLocked = "false";
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(applyCommandUnlock);
}

window.addEventListener("safari-runtime-changed", schedule, { passive: true });
window.addEventListener("pageshow", schedule, { passive: true });

const card = byId("battle-card");
if (card && typeof MutationObserver === "function") {
  new MutationObserver(schedule).observe(card, { subtree: true, attributes: true, attributeFilter: ["disabled", "inert", "data-turn-phase-locked"] });
}

schedule();
globalThis.__maplessApplyBattleCommandUnlock = applyCommandUnlock;
