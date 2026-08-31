import { canonicalTrainerPublishedPath } from "./runtime/canonical-trainer-sources.js";

let scheduled = false;

function trainerBattle() {
  const battle = globalThis.__maplessSafariRuntime?.variables?.mapless?.battle;
  return battle?.kind === "trainer" ? battle : null;
}

function ensureImage() {
  const hud = document.getElementById("trainer-battle-hud");
  if (!hud) return null;
  let image = document.getElementById("trainer-battle-canonical-sprite");
  if (image) return image;
  image = document.createElement("img");
  image.id = "trainer-battle-canonical-sprite";
  image.className = "trainer-battle-canonical-sprite";
  image.alt = "";
  image.setAttribute("aria-hidden", "true");
  image.decoding = "async";
  image.loading = "eager";
  image.addEventListener("error", () => {
    image.dataset.failedSrc = image.currentSrc || image.src;
    image.hidden = true;
  });
  hud.prepend(image);
  return image;
}

function render() {
  scheduled = false;
  const image = ensureImage();
  if (!image) return;
  const battle = trainerBattle();
  const trainerType = String(battle?.trainer?.trainer_type ?? "").trim();
  const publishedPath = trainerType
    ? canonicalTrainerPublishedPath(`${trainerType}.png`)
    : null;
  if (!battle || !publishedPath) {
    image.hidden = true;
    image.removeAttribute("src");
    delete image.dataset.trainerType;
    delete image.dataset.failedSrc;
    return;
  }

  const src = new URL(publishedPath, import.meta.url).href;
  if (image.dataset.failedSrc === src) {
    image.hidden = true;
    return;
  }
  if (image.src !== src) {
    delete image.dataset.failedSrc;
    image.src = src;
  }
  image.dataset.trainerType = trainerType;
  image.hidden = false;
}

function scheduleRender() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(render);
}

window.addEventListener("pageshow", scheduleRender, { passive: true });
window.addEventListener("safari-runtime-changed", scheduleRender, { passive: true });
requestAnimationFrame(render);
