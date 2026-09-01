import { canonicalBattleUiAssetUrl } from "./runtime/canonical-battle-ui-sources.js?v=20260901-2158";

const byId = (id) => document.getElementById(id);
let scheduled = false;
let replacementMessageTimer = 0;
let lastReplacementSignature = null;

const TRAINER_PARTY_BALL_ICON_BY_STATE = Object.freeze({
  occupied: "icon_ball.png",
  empty: "icon_ball_empty.png",
  fainted: "icon_ball_faint.png",
  status: "icon_ball_status.png",
});

function runtimeState() {
  return globalThis.__maplessSafariRuntime?.variables?.mapless ?? null;
}

function trainerBattle() {
  const battle = runtimeState()?.battle;
  return battle?.kind === "trainer" ? battle : null;
}

function pokemonName(pokemon) {
  return String(pokemon?.species ?? "?");
}

function isFainted(pokemon) {
  return Number(pokemon?.hp ?? 0) <= 0;
}

function hasStatus(pokemon) {
  const status = String(pokemon?.status ?? "NONE").trim().toUpperCase();
  return Boolean(status && status !== "NONE" && status !== "OK");
}

function hpPercent(pokemon) {
  const hp = Number(pokemon?.hp ?? 0);
  const maxHp = Number(pokemon?.max_hp ?? 0);
  if (!(maxHp > 0)) return 0;
  return Math.max(0, Math.min(100, (hp / maxHp) * 100));
}

function teamState(battle) {
  const party = Array.isArray(battle?.trainer_party) ? battle.trainer_party : [];
  const active = Math.max(0, Number(battle?.trainer_party_index ?? 0));
  const remaining = party.filter((pokemon, index) => index >= active && !isFainted(pokemon)).length;
  return { party, active, remaining };
}

function latestReplacementEvent(battle) {
  const events = Array.isArray(battle?.presentation) ? battle.presentation : [];
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index]?.type === "trainer_next") return events[index];
  }
  return null;
}

function syncReplacementFoePresentation(battle) {
  const foe = battle?.foe;
  if (!foe) return;
  const name = byId("foe-name");
  const level = byId("foe-level");
  const hp = byId("foe-hp");
  const hpBar = byId("foe-hp-bar");
  const species = pokemonName(foe);
  const levelText = `Lv.${Number(foe.level ?? 0)}`;
  const hpText = `${Number(foe.hp ?? 0)} / ${Number(foe.max_hp ?? 0)}`;
  const width = `${hpPercent(foe)}%`;
  if (name && name.textContent !== species) name.textContent = species;
  if (level && level.textContent !== levelText) level.textContent = levelText;
  if (hp && hp.textContent !== hpText) hp.textContent = hpText;
  if (hpBar && hpBar.style.width !== width) hpBar.style.width = width;
}

function scheduleReplacementMessage(battle) {
  const replacement = latestReplacementEvent(battle);
  if (!replacement) return;
  const partyIndex = Number(replacement.partyIndex ?? battle.trainer_party_index ?? 0);
  const species = replacement.species ?? battle.trainer_party?.[partyIndex]?.species ?? battle.foe?.species ?? "次のポケモン";
  const trainer = replacement.trainer ?? battle.trainer?.trainer_full_name ?? "トレーナー";
  const signature = `${Number(battle.turn ?? 0)}:${partyIndex}:${species}`;
  if (signature === lastReplacementSignature) return;
  lastReplacementSignature = signature;
  if (replacementMessageTimer) window.clearTimeout(replacementMessageTimer);
  replacementMessageTimer = window.setTimeout(() => {
    replacementMessageTimer = 0;
    const current = trainerBattle();
    if (!current || current.completed || Number(current.trainer_party_index ?? 0) !== partyIndex) return;
    syncReplacementFoePresentation(current);
    const message = byId("battle-message");
    if (message) message.textContent = `${trainer}は${species}を繰り出した！`;
  }, 360);
}

function ensureHud() {
  const card = byId("battle-card");
  const arena = card?.querySelector(".arena");
  if (!card || !arena) return null;
  let hud = byId("trainer-battle-hud");
  if (hud) return hud;
  hud = document.createElement("section");
  hud.id = "trainer-battle-hud";
  hud.className = "trainer-battle-hud";
  hud.setAttribute("aria-live", "polite");
  hud.innerHTML = `<div class="trainer-battle-label"><span class="trainer-battle-kicker">TRAINER</span><strong id="trainer-battle-name">Trainer</strong></div><div class="trainer-battle-progress"><span id="trainer-battle-count">残り 0</span><div id="trainer-battle-party" class="trainer-party-pips" aria-label="相手の手持ち"></div></div>`;
  arena.before(hud);
  return hud;
}

function syncFleePresentation(battle) {
  const flee = byId("flee");
  if (!flee) return;
  if (battle && !battle.completed) {
    flee.textContent = "にげられない";
    flee.setAttribute("aria-disabled", "true");
    return;
  }
  flee.textContent = "にげる";
  flee.removeAttribute("aria-disabled");
}

function lineupIconState(pokemon, index, active) {
  if (!pokemon) return "empty";
  if (index < active || isFainted(pokemon)) return "fainted";
  if (hasStatus(pokemon)) return "status";
  return "occupied";
}

function lineupPip(pokemon, index, active, completed) {
  const state = lineupIconState(pokemon, index, active);
  const src = canonicalBattleUiAssetUrl(TRAINER_PARTY_BALL_ICON_BY_STATE[state], {
    consumer: "trainer-party-pips",
  });
  if (!src) return null;

  const item = document.createElement("img");
  item.className = "trainer-party-ball-icon";
  item.src = src;
  item.alt = "";
  item.setAttribute("aria-hidden", "true");
  item.dataset.partyState = state;
  if (pokemon) {
    item.title = pokemonName(pokemon);
    item.dataset.partyIndex = String(index);
    if (index === active && !completed) item.dataset.active = "true";
  }
  return item;
}

function render() {
  const hud = ensureHud();
  if (!hud) return;
  const battle = trainerBattle();
  hud.hidden = !battle;
  document.body.classList.toggle("trainer-battle-active", Boolean(battle));
  syncFleePresentation(battle);
  if (!battle) {
    lastReplacementSignature = null;
    if (replacementMessageTimer) {
      window.clearTimeout(replacementMessageTimer);
      replacementMessageTimer = 0;
    }
    return;
  }

  const { party, active, remaining } = teamState(battle);
  byId("trainer-battle-name").textContent = battle.trainer?.trainer_full_name ?? "トレーナー";
  byId("trainer-battle-count").textContent = battle.completed ? "RESULT" : `残り ${remaining} / ${party.length || 1}`;

  const lineup = Array.from({ length: Math.max(6, party.length || 1) }, (_, index) => party[index] ?? (index === 0 ? battle.foe : null));
  const pips = lineup.map((pokemon, index) => lineupPip(pokemon, index, active, battle.completed)).filter(Boolean);
  byId("trainer-battle-party").replaceChildren(...pips);
  if (!battle.completed) scheduleReplacementMessage(battle);
}

function scheduleRender() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    render();
  });
}

window.addEventListener("pageshow", scheduleRender, { passive: true });
window.addEventListener("safari-runtime-changed", scheduleRender, { passive: true });
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) scheduleRender();
});
render();
