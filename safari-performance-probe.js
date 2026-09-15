const KEY = "__maplessPresentationPerformance";
const root = globalThis;

function now() {
  return performance.now();
}

const metrics = root[KEY] ?? {
  version: 1,
  startedAt: now(),
  frames: { count: 0, slow: 0, worstMs: 0, lastMs: 0 },
  longTasks: { count: 0, totalMs: 0, worstMs: 0 },
  resources: { count: 0, imageCount: 0, imageDurationMs: 0, imageTransferBytes: 0 },
  dom: { nodes: 0, lastSampleAt: 0 },
  memory: { usedJSHeapBytes: null, totalJSHeapBytes: null, limitJSHeapBytes: null },
  samples: 0,
};
root[KEY] = metrics;

let rafPending = false;
let lastFrameAt = 0;

function sampleFrame(ts) {
  rafPending = false;
  if (lastFrameAt) {
    const dt = ts - lastFrameAt;
    metrics.frames.count += 1;
    metrics.frames.lastMs = dt;
    metrics.frames.worstMs = Math.max(metrics.frames.worstMs, dt);
    if (dt > 50) metrics.frames.slow += 1;
  }
  lastFrameAt = ts;
}

function requestFrameSample() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(sampleFrame);
}

function sampleSnapshot() {
  metrics.samples += 1;
  metrics.dom.nodes = document.getElementsByTagName("*").length;
  metrics.dom.lastSampleAt = now();
  const memory = performance.memory;
  if (memory) {
    metrics.memory.usedJSHeapBytes = memory.usedJSHeapSize ?? null;
    metrics.memory.totalJSHeapBytes = memory.totalJSHeapSize ?? null;
    metrics.memory.limitJSHeapBytes = memory.jsHeapSizeLimit ?? null;
  }
  requestFrameSample();
  window.dispatchEvent(new CustomEvent("mapless-performance-sample", { detail: snapshot() }));
}

function snapshot() {
  return JSON.parse(JSON.stringify(metrics));
}

root.__maplessPerformanceSnapshot = snapshot;
root.__maplessPerformanceSample = sampleSnapshot;

try {
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      metrics.longTasks.count += 1;
      metrics.longTasks.totalMs += entry.duration;
      metrics.longTasks.worstMs = Math.max(metrics.longTasks.worstMs, entry.duration);
    }
  }).observe({ type: "longtask", buffered: true });
} catch {}

try {
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      metrics.resources.count += 1;
      if (entry.initiatorType === "img") {
        metrics.resources.imageCount += 1;
        metrics.resources.imageDurationMs += entry.duration;
        metrics.resources.imageTransferBytes += entry.transferSize || 0;
      }
    }
  }).observe({ type: "resource", buffered: true });
} catch {}

const signals = [
  "pageshow",
  "safari-runtime-changed",
  "safari-preview-start",
  "safari-species-form-front-atlas-state",
];
for (const type of signals) window.addEventListener(type, sampleSnapshot, { passive: true });
document.addEventListener("click", sampleSnapshot, { passive: true });

sampleSnapshot();
