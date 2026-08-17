const byId = (id) => document.getElementById(id);
let scheduled = false;
let replacementMessageTimer = 0;
let lastReplacementSignature = null;

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

function lineupPip(pokemon, index, active, completed) {
  const item = document.createElement("span");
  item.className = "trainer-party-pip";
  if (!pokemon) {
    item.classList.add("empty");
    item.setAttribute("aria-label", `${index + 1}: 空き`);
    return item;
  }
  const fainted = index < active || isFainted(pokemon);
  if (index === active && !completed) item.classList.add("active");
  if (fainted) item.classList.add("fainted");
  else if (hasStatus(pokemon)) item.classList.add("status");
  item.title = pokemonName(pokemon);
  item.setAttribute("aria-label", `${index + 1}: ${pokemonName(pokemon)}${index === active ? " 使用中" : ""}${fainted ? " ひんし" : hasStatus(pokemon) ? " 状態異常" : ""}`);
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
  const pips = lineup.map((pokemon, index) => lineupPip(pokemon, index, active, battle.completed));
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

const root = byId("battle-card");
const arena = root?.querySelector(".arena");
if (arena) {
  // The HUD is a sibling of .arena, so this observer cannot observe its own
  // writes. Do not observe attributes; battle presentation mutates attributes.
  new MutationObserver(scheduleRender).observe(arena, {
    subtree: true,
    childList: true,
    characterData: true,
  });
}
if (root) {
  root.addEventListener("pointerdown", scheduleRender, { passive: true });
  root.addEventListener("click", scheduleRender, { passive: true });
}
window.addEventListener("pageshow", scheduleRender, { passive: true });
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) scheduleRender();
});
render();
