import { resolveCanonicalNormalEventArt } from "./runtime/canonical-normal-event-art-assets.js?v=20260913-2000";

const STYLE_HREF = "./normal-event-art-presentation.css?v=20260913-2000";
let syncQueued = false;

function ensureStyle() {
  if (document.querySelector(`link[data-mapless-normal-event-art="${STYLE_HREF}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = STYLE_HREF;
  link.dataset.maplessNormalEventArt = STYLE_HREF;
  document.head.append(link);
}

function activeNormalEvent() {
  const active = globalThis.__maplessNormalEventUi ?? null;
  const runtime = globalThis.__maplessSafariRuntime ?? null;
  return active?.runtime === runtime ? active : null;
}

function removeArt() {
  document.getElementById("normal-event-canonical-art")?.remove();
}

function syncArt() {
  syncQueued = false;
  const card = document.getElementById("normal-event-card");
  const message = document.getElementById("normal-event-message");
  const active = activeNormalEvent();
  if (!card || card.hidden || !message || !active) {
    removeArt();
    return;
  }

  const path = resolveCanonicalNormalEventArt(active.eventId);
  if (!path) {
    removeArt();
    card.dataset.canonicalEventArt = "unpublished";
    return;
  }

  ensureStyle();
  card.dataset.canonicalEventArt = "loading";
  let image = document.getElementById("normal-event-canonical-art");
  if (!(image instanceof HTMLImageElement)) {
    image = document.createElement("img");
    image.id = "normal-event-canonical-art";
    image.className = "normal-event-canonical-art";
    image.alt = "";
    image.decoding = "async";
    image.loading = "eager";
    message.before(image);
  }

  const nextSrc = `./${path}`;
  if (image.getAttribute("src") === nextSrc) return;
  image.hidden = true;
  image.onload = () => {
    image.hidden = false;
    card.dataset.canonicalEventArt = "ready";
  };
  image.onerror = () => {
    image.hidden = true;
    card.dataset.canonicalEventArt = "load-error";
    card.dataset.canonicalEventArtPath = path;
    console.error(`[Mapless] canonical normal-event art failed to load: ${path}`);
  };
  card.dataset.canonicalEventArtPath = path;
  image.src = nextSrc;
}

function scheduleSync() {
  if (syncQueued) return;
  syncQueued = true;
  requestAnimationFrame(syncArt);
}

window.addEventListener("safari-normal-event-rendered", scheduleSync, { passive:true });
window.addEventListener("safari-normal-event-closed", scheduleSync, { passive:true });
window.addEventListener("safari-runtime-changed", scheduleSync, { passive:true });
window.addEventListener("pageshow", scheduleSync, { passive:true });
scheduleSync();
