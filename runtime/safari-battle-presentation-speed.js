const PRESENTATION_DELAYS = new Set([180, 220, 240, 280, 300]);
const MAX_PRESENTATION_DELAY_MS = 70;

export function installSafariBattlePresentationSpeed() {
  if (globalThis.__maplessBattlePresentationSpeedInstalled) return;
  globalThis.__maplessBattlePresentationSpeedInstalled = true;

  const nativeSetTimeout = globalThis.setTimeout.bind(globalThis);
  globalThis.setTimeout = (callback, delay = 0, ...args) => {
    const milliseconds = Number(delay);
    const battle = globalThis.__maplessSafariRuntime?.variables?.mapless?.battle ?? null;
    const card = globalThis.document?.getElementById?.("battle-card") ?? null;
    const isKnownBattlePresentationWait = Boolean(
      battle && card && !card.hidden && PRESENTATION_DELAYS.has(milliseconds)
    );
    return nativeSetTimeout(
      callback,
      isKnownBattlePresentationWait ? Math.min(milliseconds, MAX_PRESENTATION_DELAY_MS) : delay,
      ...args,
    );
  };
}

installSafariBattlePresentationSpeed();
