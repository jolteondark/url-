import { createP1PlayableController } from './p1-playable-controller.js';
import { createP1PixelDomRenderer } from './p1-pixel-dom-renderer.js';
import { createP1PresentationPump } from './p1-presentation-pump.js';
import { loadPublishedShowdownBrowserArtifact } from './browser-showdown-artifact.js';
import { p1PresentationMessage } from '../presentation/messages/p1-event-message.js';
import { snapshotSafariActionGate } from './safari-action-gate.js';

function randomUint32(crypto = globalThis.crypto) {
  if (!crypto || typeof crypto.getRandomValues !== 'function') throw new Error('Web Crypto random source is required for Fresh Start');
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] >>> 0;
}

function newRunId(crypto = globalThis.crypto) {
  if (typeof crypto?.randomUUID === 'function') return `web:${crypto.randomUUID()}`;
  return `web:${randomUint32(crypto).toString(16)}:${randomUint32(crypto).toString(16)}`;
}

export async function createP1BrowserApp(root, {
  storage = globalThis.localStorage,
  crypto = globalThis.crypto,
  manifestUrl = './vendor/showdown/browser/manifest.json',
  showdownLoader = loadPublishedShowdownBrowserArtifact,
  controllerFactory = createP1PlayableController,
  rendererFactory = createP1PixelDomRenderer,
  pumpFactory = createP1PresentationPump,
  freshStartIdentity = null,
  performanceProbe = null,
} = {}) {
  if (!root) throw new Error('P1 browser app requires a root element');
  const loaded = typeof performanceProbe?.measureAssetLoad === 'function'
    ? await performanceProbe.measureAssetLoad(() => showdownLoader({ manifestUrl }))
    : await showdownLoader({ manifestUrl });
  const controller = controllerFactory({
    showdown: loaded.showdown,
    storage,
  });
  let lastResolved = null;
  let destroyed = false;
  let renderer;
  let pump;

  function snapshotOrNull() {
    try { return controller.snapshot(); } catch { return null; }
  }

  function render() {
    if (destroyed) return;
    const draw = () => renderer.render({
      state: snapshotOrNull(),
      resolved: lastResolved,
      activeBattle: controller.activeBattle(),
      canContinue: controller.hasSave(),
    });
    if (typeof performanceProbe?.measureRender === 'function') performanceProbe.measureRender(draw);
    else {
      draw();
      performanceProbe?.markRender?.();
    }
  }

  function present(job) {
    const text = p1PresentationMessage(job.event);
    if (text) renderer.setMessage(text);
    renderer.presentEvent?.(job.event);
    render();
  }

  pump = pumpFactory(controller.presentationQueue, { onJob: present });

  async function action(work) {
    if (destroyed) return;
    renderer.setBusy(true);
    try {
      await work();
      render();
      pump.kick();
    } finally {
      renderer.setBusy(false);
    }
  }

  renderer = rendererFactory(root, {
    onFreshStart: () => action(async () => {
      const identity = typeof freshStartIdentity === 'function'
        ? freshStartIdentity()
        : { runId: newRunId(crypto), seed: randomUint32(crypto) };
      lastResolved = null;
      controller.freshStart(identity);
      renderer.setMessage('');
    }),
    onContinue: () => action(async () => {
      lastResolved = null;
      const result = controller.continueRun();
      if (!result.found) renderer.setMessage('セーブデータがありません。');
    }),
    onBoardSlot: (slotIndex, slot) => action(async () => {
      if (slot.kind === 'next_day') {
        lastResolved = null;
        controller.advanceDay({ confirmed: true });
        return;
      }
      if (slot.kind !== 'wild') return;
      await controller.prepareWild(slotIndex);
      const started = await controller.startWildBattle(slotIndex);
      lastResolved = started.resolved;
    }),
    onMove: (moveSlot) => action(async () => {
      const result = await controller.fight(moveSlot);
      lastResolved = result.resolved;
    }),
    onReward: () => action(async () => {
      controller.commitReward();
      lastResolved = null;
    }),
    onAssetDecode: (durationMs) => performanceProbe?.markAssetDecode?.(durationMs),
  });

  render();

  function diagnostics() {
    return Object.freeze({
      performance: performanceProbe?.snapshot?.() ?? null,
      presentation: pump.snapshot?.() ?? null,
      actionGate: controller.actionGate ? snapshotSafariActionGate(controller.actionGate) : null,
      mode: snapshotOrNull()?.mode ?? null,
      day: snapshotOrNull()?.day ?? null,
    });
  }

  function destroy() {
    destroyed = true;
    pump.destroy();
    performanceProbe?.stop?.();
    root.replaceChildren();
  }

  return Object.freeze({
    controller,
    renderer,
    pump,
    showdownPublication: loaded.manifest,
    render,
    diagnostics,
    destroy,
  });
}

export async function bootP1BrowserApp(root, options = {}) {
  try {
    return await createP1BrowserApp(root, options);
  } catch (error) {
    if (root) {
      const message = root.ownerDocument?.createElement?.('pre');
      if (message) {
        message.textContent = `Mapless P1 startup failed\n${error instanceof Error ? error.message : String(error)}`;
        root.replaceChildren(message);
      }
    }
    throw error;
  }
}

export { newRunId as createP1BrowserRunId, randomUint32 as createP1BrowserSeed };
