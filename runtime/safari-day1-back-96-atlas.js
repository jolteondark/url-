const SPECIES = Object.freeze([
  "BULBASAUR","CHARMANDER","SQUIRTLE","CATERPIE","WEEDLE",
  "PIDGEY","RATTATA","SPEAROW","EKANS","SANDSHREW",
]);

const INDEX = new Map(SPECIES.map((species, index) => [species, index]));
const URL = new URL("../assets/canonical-battle-sprites/day1-back/back-00.webp", import.meta.url).href;
let loadState = "idle";

function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("safari-day1-back-96-atlas-state"));
}

function ensureLoaded() {
  if (typeof Image === "undefined") return true;
  if (loadState === "ready") return true;
  if (loadState === "failed") return false;
  if (loadState === "idle") {
    loadState = "loading";
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      loadState = image.naturalWidth > 0 ? "ready" : "failed";
      notify();
    };
    image.onerror = () => {
      loadState = "failed";
      notify();
    };
    image.src = URL;
  }
  return false;
}

export function applySafariDay1Back96Sprite(element, species, { size = 96 } = {}) {
  if (!(element instanceof HTMLElement)) return false;
  const index = INDEX.get(String(species));
  if (!Number.isInteger(index)) return false;
  if (!ensureLoaded()) return false;
  const col = index % 5;
  const row = Math.floor(index / 5);
  element.dataset.spriteSpecies = String(species);
  element.dataset.spriteAtlasFamily = "canonical-day1-back-96";
  element.style.width = `${size}px`;
  element.style.height = `${size}px`;
  element.style.backgroundImage = `url("${URL}")`;
  element.style.backgroundSize = `${5 * size}px ${2 * size}px`;
  element.style.backgroundPosition = `${-col * size}px ${-row * size}px`;
  element.style.backgroundRepeat = "no-repeat";
  element.style.imageRendering = "pixelated";
  return true;
}

export const SAFARI_DAY1_BACK_96_COVERAGE = SPECIES.length;
