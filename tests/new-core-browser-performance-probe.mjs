import assert from 'node:assert/strict';
import { createBrowserPerformanceProbe } from '../src-next/platform/browser-performance-probe.js';

let nextHandle = 0;
const callbacks = new Map();
const cancelled = [];
class FakeObserver {
  static instance = null;
  constructor(callback) { this.callback = callback; FakeObserver.instance = this; }
  observe(options) { this.options = options; }
  disconnect() { this.disconnected = true; }
  emit(entries) { this.callback({ getEntries: () => entries }); }
}
let now = 0;
const environment = {
  performance: {
    now: () => now,
    memory: { usedJSHeapSize: 10, totalJSHeapSize: 20, jsHeapSizeLimit: 30 },
  },
  document: { getElementsByTagName: () => ({ length: 42 }) },
  requestAnimationFrame(callback) { const id = ++nextHandle; callbacks.set(id, callback); return id; },
  cancelAnimationFrame(id) { cancelled.push(id); callbacks.delete(id); },
  PerformanceObserver: FakeObserver,
};

const probe = createBrowserPerformanceProbe(environment);
assert.equal(probe.start(), true);
assert.equal(probe.start(), false, 'must not create a second rAF/observer loop');
callbacks.get(1)(100);
callbacks.get(2)(116);
callbacks.get(3)(150);
FakeObserver.instance.emit([{ duration: 55 }, { duration: 80 }]);
probe.markRender();
probe.markRender(2);
now = 100;
probe.measureRender(() => { now = 106; });
await probe.measureAssetLoad(async () => { now = 125; });
probe.markAssetDecode(12);
probe.markAssetDecode(28);

const active = probe.snapshot();
assert.equal(active.frames, 2);
assert.equal(active.averageFrameMs, 25);
assert.equal(active.maxFrameMs, 34);
assert.equal(active.estimatedFps, 40);
assert.equal(active.longTasks, 2);
assert.equal(active.longTaskTotalMs, 135);
assert.equal(active.maxLongTaskMs, 80);
assert.equal(active.renders, 4);
assert.equal(active.renderTotalMs, 6);
assert.equal(active.averageRenderMs, 1.5);
assert.equal(active.maxRenderMs, 6);
assert.equal(active.probeRafActive, 1);
assert.equal(active.assetLoads, 1);
assert.equal(active.assetLoadTotalMs, 19);
assert.equal(active.maxAssetLoadMs, 19);
assert.equal(active.assetDecodes, 2);
assert.equal(active.assetDecodeTotalMs, 40);
assert.equal(active.maxAssetDecodeMs, 28);
assert.equal(active.domNodes, 42);
assert.equal(active.memory.usedJSHeapSize, 10);
assert.deepEqual(active.support, { frameCadence: true, longTaskObserver: true, memory: true, domNodes: true });

assert.equal(probe.stop(), true);
assert.equal(probe.stop(), false);
assert.equal(FakeObserver.instance.disconnected, true);
assert.ok(cancelled.length >= 1);

const unsupported = createBrowserPerformanceProbe({ performance: {} });
assert.equal(unsupported.start(), true);
assert.deepEqual(unsupported.snapshot().support, {
  frameCadence: false,
  longTaskObserver: false,
  memory: false,
  domNodes: false,
});
assert.equal(unsupported.stop(), true);
assert.equal(unsupported.snapshot().probeRafActive, 0);
assert.throws(() => probe.markRender(0), /positive integer/);
assert.throws(() => probe.markRenderDuration(-1), /non-negative finite/);
assert.throws(() => probe.markAssetLoad(-1), /non-negative finite/);
assert.throws(() => probe.markAssetDecode(-1), /non-negative finite/);

console.log('new-core-browser-performance-probe-smoke: ok');
