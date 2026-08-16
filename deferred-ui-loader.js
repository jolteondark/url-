const OPTIONAL_UI_MODULES = [
  "./game-presentation.js",
  "./camp-presentation.js",
  "./battle-sprite-bridge.js",
  "./game-menu-bridge.js",
  "./party-panel-bridge.js",
  "./storage-panel-bridge.js",
  "./party-storage-controls-bridge.js",
  "./species-form-metadata-bridge.js",
  "./species-sprite-atlas-bridge.js",
  "./terminal-wild-presentation.js",
  "./shop-touch-presentation.js",
  "./trainer-battle-presentation.js",
];

let started = false;

async function loadOptionalUi() {
  if (started) return;
  started = true;
  for (const modulePath of OPTIONAL_UI_MODULES) {
    try {
      await import(modulePath);
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    } catch (error) {
      console.error(`[Mapless] optional UI failed: ${modulePath}`, error);
    }
  }
}

function scheduleOptionalUi() {
  const start = () => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => loadOptionalUi(), { timeout: 1200 });
    } else {
      window.setTimeout(loadOptionalUi, 250);
    }
  };
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
}

scheduleOptionalUi();
