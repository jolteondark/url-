import { SAFARI_MOVE_PRESENTATION } from "./runtime/safari-web-playable-integration.js";
import { formatSafariBattlePresentationEvent } from "./battle-presentation-narration.js";

const byId = (id) => document.getElementById(id);
const sleep = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

function runtime() {
  return globalThis.__maplessSafariRuntime ?? null;
}

function activeBattlePlayer(battle) {
  const state = runtime();
  const index = Number(battle?.player_party_index ?? 0);
  return state?.player?.party?.[index] ?? state?.player?.party?.[0] ?? null;
}

function combatantName(side) {
  const visible = byId(side + "-name")?.textContent?.trim();
  if (visible) return visible;
  const battle = runtime()?.variables?.mapless?.battle;
  if (side === "player") return activeBattlePlayer(battle)?.species ?? "味方のポケモン";
  if (side === "foe") return battle?.foe?.species ?? "相手のポケモン";
  return "ポケモン";
}

function messageFor(event) {
  const battle = runtime()?.variables?.mapless?.battle;
  return formatSafariBattlePresentationEvent(event, {
    actorName: combatantName(event.actor),
    targetName: combatantName(event.target),
    moveName: SAFARI_MOVE_PRESENTATION[event.moveId]?.name ?? event.moveId,
    notice: runtime()?.variables?.mapless?.notice ?? battle?.notice,
  });
}

function percent(hp, maxHp) {
  if (!maxHp) return 0;
  return Math.max(0, Math.min(100, (Number(hp) / Number(maxHp)) * 100));
}

function setMessage(text) {
  if (!text) return;
  const message = byId("battle-message");
  if (!message) return;
  message.dataset.presentationOwner = "event";
  if (message.textContent !== text) message.textContent = text;
}

export async function playSafariBattleCommandPresentation(events = []) {
  const panel = byId("battle-card")?.querySelector(".battle-command-panel");
  if (panel) panel.inert = true;
  try {
    for (const event of events) {
      const message = messageFor(event);
      if (message) setMessage(message);

      if (event.type === "move_started") {
        const actor = byId(event.actor + "-combatant");
        actor?.classList.add("lunge");
        await sleep(180);
        actor?.classList.remove("lunge");
      } else if (event.type === "damage_applied") {
        const target = byId(event.target + "-combatant");
        const battle = runtime()?.variables?.mapless?.battle;
        const pokemon = event.target === "player" ? activeBattlePlayer(battle) : battle?.foe;
        const maxHp = Number(event.targetMaxHp ?? pokemon?.max_hp ?? 0);
        const hp = byId(event.target + "-hp");
        const bar = byId(event.target + "-hp-bar");
        if (hp) hp.textContent = event.hpAfter + " / " + maxHp;
        if (bar) bar.style.width = percent(event.hpAfter, maxHp) + "%";
        target?.classList.add("hit");
        await sleep(220);
        target?.classList.remove("hit");
      } else if (event.type === "miss") {
        await sleep(240);
      } else if (event.type === "faint" || event.type === "trainer_next") {
        await sleep(280);
      } else if (event.type === "battle_result" || event.type === "capture") {
        if (message) await sleep(300);
      }
    }
  } finally {
    if (panel) panel.inert = false;
  }
}
