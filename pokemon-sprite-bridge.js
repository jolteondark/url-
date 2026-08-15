const POKEAPI_LIST = "https://pokeapi.co/api/v2/pokemon?limit=2000";
const POKEAPI_HOME_SPRITE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home";

let pokemonIndexPromise = null;
let scheduled = false;

function normalizeSpecies(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function loadPokemonIndex() {
  if (pokemonIndexPromise) return pokemonIndexPromise;
  pokemonIndexPromise = fetch(POKEAPI_LIST, { mode: "cors" })
    .then((response) => {
      if (!response.ok) throw new Error(`PokéAPI ${response.status}`);
      return response.json();
    })
    .then((payload) => {
      const index = new Map();
      for (const entry of payload?.results ?? []) {
        const match = String(entry?.url ?? "").match(/\/pokemon\/(\d+)\/?$/);
        if (!match) continue;
        index.set(normalizeSpecies(entry.name), Number(match[1]));
      }
      return index;
    })
    .catch(() => new Map());
  return pokemonIndexPromise;
}

async function spriteUrl(species) {
  const index = await loadPokemonIndex();
  const id = index.get(normalizeSpecies(species));
  return id ? `${POKEAPI_HOME_SPRITE}/${id}.png` : null;
}

function ensureStyle() {
  if (document.getElementById("pokemon-sprite-bridge-style")) return;
  const style = document.createElement("style");
  style.id = "pokemon-sprite-bridge-style";
  style.textContent = `
    .pokemon-sprite-battle{width:128px;height:128px;object-fit:contain;image-rendering:auto;filter:drop-shadow(0 8px 8px rgba(0,0,0,.28))}
    .pokemon-sprite-thumb{display:block;width:72px;height:72px;object-fit:contain;margin:1px auto 5px;image-rendering:auto}
    .text-mon.sprite-ready{font-size:0;line-height:0}
    .party-slot.sprite-card,.storage-slot.sprite-card{position:relative}
    @media(max-width:520px){.pokemon-sprite-battle{width:112px;height:112px}.pokemon-sprite-thumb{width:64px;height:64px}}
  `;
  document.head.append(style);
}

async function setSprite(container, species, className, hideFallback = false) {
  if (!container || !species) return;
  if (container.dataset.spriteSpecies === species) return;
  container.dataset.spriteSpecies = species;
  const url = await spriteUrl(species);
  if (container.dataset.spriteSpecies !== species || !url) return;
  let image = container.querySelector(`img.${className}`);
  if (!image) {
    image = document.createElement("img");
    image.className = className;
    image.alt = species;
    image.decoding = "async";
    image.loading = "eager";
    container.prepend(image);
  }
  image.onload = () => {
    image.hidden = false;
    if (hideFallback) container.classList.add("sprite-ready");
  };
  image.onerror = () => {
    image.hidden = true;
    if (hideFallback) container.classList.remove("sprite-ready");
  };
  image.hidden = true;
  image.src = url;
}

function speciesFromCard(card) {
  const text = card?.querySelector(".party-slot-head strong, .storage-slot-head strong")?.textContent ?? "";
  return text.replace(/^\s*\d+\.\s*/, "").trim();
}

function decorateBattle() {
  for (const actor of ["player", "foe"]) {
    const species = document.getElementById(`${actor}-name`)?.textContent?.trim();
    const fallback = document.querySelector(`#${actor}-combatant .text-mon`);
    if (fallback && species) setSprite(fallback, species, "pokemon-sprite-battle", true);
  }
}

function decorateCards() {
  for (const card of document.querySelectorAll(".party-slot:not(.empty), .storage-slot")) {
    const species = speciesFromCard(card);
    if (!species || species === "UNKNOWN") continue;
    card.classList.add("sprite-card");
    setSprite(card, species, "pokemon-sprite-thumb");
  }
}

function renderSprites() {
  scheduled = false;
  ensureStyle();
  decorateBattle();
  decorateCards();
}

function scheduleRender() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(renderSprites);
}

ensureStyle();
scheduleRender();
new MutationObserver(scheduleRender).observe(document.body, {
  subtree: true,
  childList: true,
  characterData: true,
  attributes: true,
  attributeFilter: ["hidden"],
});
window.addEventListener("pageshow", scheduleRender);
