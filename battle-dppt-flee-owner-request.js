import {
  SAFARI_MOVE_PRESENTATION,
  saveSafariPlayableRun,
} from "./runtime/safari-web-playable-integration.js";
import {
  captureSafariBattlePresentationAckSequence,
  completeSafariBattlePresentationForSequence,
} from "./runtime/safari-battle-presentation-ack.js";
import { attemptSafariFlee } from "./runtime/safari-flee-command.js?v=20260818-1335";
import { formatSafariBattlePresentationEvent } from "./battle-presentation-narration.js";

const byId = (id) => document.getElementById(id);
const sleep = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

function runtime() {
  return globalThis.__maplessSafariRuntime ?? null;
}

function battle() {
  return runtime()?.variables?.mapless?.battle ?? null;
}

function activePlayer(currentRuntime, currentBattle) {
  const index = Number(currentBattle?.player_party_index ?? 0);
  return currentRuntime?.player?.party?.[index] ?? currentRuntime?.player?.party?.[0] ?? null;
}

function presentationName(currentRuntime, currentBattle, side, event = {}) {
  const ownerSnapshot = side === event.actor
    ? event.actorSpecies
    : side === event.target ? event.targetSpecies : null;
  if (ownerSnapshot) return ownerSnapshot;
  if (side === "player") return activePlayer(currentRuntime, currentBattle)?.species || "味方のポケモン";
  return currentBattle?.foe?.species || "相手のポケモン";
}

function presentationMessage(currentRuntime, currentBattle, event) {
  return formatSafariBattlePresentationEvent(event, {
    actorName: presentationName(currentRuntime, currentBattle, event.actor, event),
    targetName: presentationName(currentRuntime, currentBattle, event.target, event),
    moveName: SAFARI_MOVE_PRESENTATION[event.moveId]?.name ?? event.moveId,
    notice: currentRuntime?.variables?.mapless?.notice,
  });
}

function setMessage(text) {
  const node = byId("battle-message");
  if (!node || !text) return;
  node.dataset.presentationOwner = "event";
  node.textContent = text;
}

function hpNode(side) {
  return {
    combatant: byId(side + "-combatant"),
    hp: byId(side + "-hp"),
    bar: byId(side + "-hp-bar"),
  };
}

async function playPresentation(currentRuntime, events = []) {
  for (const event of events) {
    const currentBattle = currentRuntime?.variables?.mapless?.battle ?? null;
    const message = presentationMessage(currentRuntime, currentBattle, event);
    if (message) setMessage(message);

    if (event.type === "move_started") {
      const actor = hpNode(event.actor).combatant;
      actor?.classList.add("lunge");
      await sleep(180);
      actor?.classList.remove("lunge");
    } else if (event.type === "damage_applied") {
      const target = hpNode(event.target);
      const pokemon = event.target === "player" ? activePlayer(currentRuntime, currentBattle) : currentBattle?.foe;
      const maxHp = Number(event.targetMaxHp ?? pokemon?.max_hp ?? 0);
      if (target.hp && maxHp > 0) target.hp.textContent = `${event.hpAfter} / ${maxHp}`;
      if (target.bar && maxHp > 0) {
        const percent = Math.max(0, Math.min(100, Number(event.hpAfter) / maxHp * 100));
        target.bar.style.width = percent + "%";
      }
      target.combatant?.classList.add("hit");
      await sleep(220);
      target.combatant?.classList.remove("hit");
    } else if (event.type === "miss") {
      await sleep(240);
    } else if (event.type === "faint" || event.type === "trainer_next") {
      await sleep(280);
    } else if (event.type === "flee" || event.type === "battle_result") {
      if (message) await sleep(300);
    }
  }
}

function saveIfRequested(currentRuntime, result) {
  const requested = result?.persistenceRequested
    || result?.operations?.some((operation) => operation.op === "request_save");
  if (!requested) return;
  saveSafariPlayableRun(window.localStorage, currentRuntime);
}

async function runFleeRequest(sourceButton) {
  const currentRuntime = runtime();
  const currentBattle = currentRuntime?.variables?.mapless?.battle;
  if (!currentRuntime || currentBattle?.phase !== "COMMAND") return;
  if (currentBattle.kind !== "wild" || currentBattle.origin === "village_bounty") return;

  if (sourceButton instanceof HTMLElement) sourceButton.blur();

  try {
    const result = attemptSafariFlee(currentRuntime);
    const presentationSequence = captureSafariBattlePresentationAckSequence(currentRuntime);
    globalThis.__maplessLastFleeResult = result;
    await playPresentation(currentRuntime, result.presentation ?? []);
    completeSafariBattlePresentationForSequence(currentRuntime, presentationSequence);
    saveIfRequested(currentRuntime, result);
  } catch (error) {
    globalThis.__maplessLastError = error;
    console.error("[Mapless] DPt flee request failed", error);
  } finally {
    window.dispatchEvent(new CustomEvent("safari-runtime-changed"));
  }
}

function requestFlee(sourceButton) {
  void runFleeRequest(sourceButton);
}

window.addEventListener("safari-battle-flee-requested", (event) => {
  requestFlee(event.detail?.sourceButton ?? null);
});

byId("battle-card")?.addEventListener("click", (event) => {
  const button = event.target.closest('[data-dppt-command="flee"]');
  if (!button) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  requestFlee(button);
}, true);
