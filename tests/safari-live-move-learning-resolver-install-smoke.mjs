import assert from "node:assert/strict";

const originalWindow = globalThis.window;
const originalRaf = globalThis.requestAnimationFrame;
const originalResolver = globalThis.__maplessSafariMoveLearningResolver;

try {
  const listeners = [];
  globalThis.window = {
    addEventListener(type, listener, options) {
      listeners.push({ type, listener, options });
    },
    dispatchEvent() {},
  };
  globalThis.requestAnimationFrame = () => 0;
  delete globalThis.__maplessSafariMoveLearningResolver;
  delete globalThis.__maplessSafariRuntime;

  await import(`../runtime/safari-battle-runtime-prewarm.js?live-resolver-install=${Date.now()}`);

  assert.equal(typeof globalThis.__maplessSafariMoveLearningResolver, "function");
  assert.deepEqual(listeners.map(({ type }) => type), ["safari-runtime-changed", "pageshow"]);
  console.log("safari live move-learning resolver install smoke: PASS");
} finally {
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  if (originalRaf === undefined) delete globalThis.requestAnimationFrame;
  else globalThis.requestAnimationFrame = originalRaf;
  if (originalResolver === undefined) delete globalThis.__maplessSafariMoveLearningResolver;
  else globalThis.__maplessSafariMoveLearningResolver = originalResolver;
}
