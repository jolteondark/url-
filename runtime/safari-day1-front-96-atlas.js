const SPECIES = Object.freeze([
  "BULBASAUR","CHARMANDER","SQUIRTLE","CATERPIE","WEEDLE","PIDGEY","RATTATA","SPEAROW","EKANS","SANDSHREW",
  "NIDORANfE","NIDORANmA","VULPIX","ZUBAT","ODDISH","PARAS","VENONAT","DIGLETT","MEOWTH","PSYDUCK",
  "MANKEY","GROWLITHE","POLIWAG","ABRA","MACHOP","BELLSPROUT","TENTACOOL","GEODUDE","PONYTA","SLOWPOKE",
  "MAGNEMITE","FARFETCHD","DODUO","SEEL","GRIMER","SHELLDER","GASTLY","ONIX","DROWZEE","KRABBY",
  "VOLTORB","EXEGGCUTE","CUBONE","LICKITUNG","KOFFING","RHYHORN","TANGELA","KANGASKHAN","HORSEA","GOLDEEN",
  "STARYU","SCYTHER","PINSIR","TAUROS","MAGIKARP","LAPRAS","DITTO","EEVEE","PORYGON","DRATINI",
]);

const INDEX = new Map(SPECIES.map((species, index) => [species, index]));
const URLS = Object.freeze(Array.from({ length: 6 }, (_, chunk) =>
  new URL(`../assets/canonical-battle-sprites/day1-front/front-${String(chunk).padStart(2, "0")}.webp`, import.meta.url).href
));
const LOAD_STATE = Array(URLS.length).fill("idle");

function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("safari-day1-front-96-atlas-state"));
}

function ensureChunkLoaded(chunk) {
  if (typeof Image === "undefined") return true;
  if (LOAD_STATE[chunk] === "ready") return true;
  if (LOAD_STATE[chunk] === "failed") return false;
  if (LOAD_STATE[chunk] === "idle") {
    LOAD_STATE[chunk] = "loading";
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      LOAD_STATE[chunk] = image.naturalWidth > 0 ? "ready" : "failed";
      notify();
    };
    image.onerror = () => {
      LOAD_STATE[chunk] = "failed";
      notify();
    };
    image.src = URLS[chunk];
  }
  return false;
}

export function applySafariDay1Front96Sprite(element, species, { size = 96 } = {}) {
  if (!(element instanceof HTMLElement)) return false;
  const index = INDEX.get(String(species));
  if (!Number.isInteger(index)) return false;
  const chunk = Math.floor(index / 10);
  const local = index % 10;
  if (!ensureChunkLoaded(chunk)) return false;
  const col = local % 5;
  const row = Math.floor(local / 5);
  element.dataset.spriteSpecies = String(species);
  element.dataset.spriteAtlasFamily = "canonical-day1-front-96";
  element.style.width = `${size}px`;
  element.style.height = `${size}px`;
  element.style.backgroundImage = `url("${URLS[chunk]}")`;
  element.style.backgroundSize = `${5 * size}px ${2 * size}px`;
  element.style.backgroundPosition = `${-col * size}px ${-row * size}px`;
  element.style.backgroundRepeat = "no-repeat";
  element.style.imageRendering = "pixelated";
  return true;
}

export const SAFARI_DAY1_FRONT_96_COVERAGE = SPECIES.length;
