const byId = (id) => document.getElementById(id);
let scheduled = false;

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

function teamState(battle) {
  const party = Array.isArray(battle?.trainer_party) ? battle.trainer_party : [];
  const active = Math.max(0, Number(battle?.trainer_party_index ?? 0));
  const remaining = party.filter((pokemon, index) => index >= active && !isFainted(pokemon)).length;
  return { party, active, remaining };
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

function render() {
  const hud = ensureHud();
  if (!hud) return;
  const battle = trainerBattle();
  hud.hidden = !battle;
  document.body.classList.toggle("trainer-battle-active", Boolean(battle));
  syncFleePresentation(battle);
  if (!battle) return;

  const { party, active, remaining } = teamState(battle);
  byId("trainer-battle-name").textContent = battle.trainer?.trainer_full_name ?? "トレーナー";
  byId("trainer-battle-count").textContent = battle.completed ? "RESULT" : `残り ${remaining} / ${party.length || 1}`;

  const pips = (party.length ? party : [battle.foe]).map((pokemon, index) => {
    const item = document.createElement("span");
    item.className = "trainer-party-pip";
    if (index === active && !battle.completed) item.classList.add("active");
    if (index < active || isFainted(pokemon)) item.classList.add("fainted");
    item.title = pokemonName(pokemon);
    item.setAttribute("aria-label", `${index + 1}: ${pokemonName(pokemon)}${index === active ? " 使用中" : ""}${isFainted(pokemon) ? " ひんし" : ""}`);
    return item;
  });
  byId("trainer-battle-party").replaceChildren(...pips);
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
