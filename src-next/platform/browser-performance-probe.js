function finite(value) {
  return Number.isFinite(value) ? Number(value) : null;
}

/**
 * Opt-in diagnostics for the first real Safari vertical.
 *
 * The probe never polls gameplay state and owns no domain truth. A single rAF
 * loop exists only while explicitly recording frame cadence. Long tasks are
 * observed when the browser exposes PerformanceObserver support.
 */
export function createBrowserPerformanceProbe(environment = globalThis) {
  const perf = environment.performance;
  const raf = environment.requestAnimationFrame?.bind(environment);
  const caf = environment.cancelAnimationFrame?.bind(environment);
  const Observer = environment.PerformanceObserver;
  const document = environment.document;

  let running = false;
  let frameHandle = null;
  let lastFrameAt = null;
  let observer = null;
  let renders = 0;
  let frames = 0;
  let frameTotalMs = 0;
  let maxFrameMs = 0;
  let longTasks = 0;
  let longTaskTotalMs = 0;
  let maxLongTaskMs = 0;

  function onFrame(now) {
    if (!running) return;
    if (lastFrameAt !== null) {
      const delta = Math.max(0, Number(now) - lastFrameAt);
      frames += 1;
      frameTotalMs += delta;
      maxFrameMs = Math.max(maxFrameMs, delta);
    }
    lastFrameAt = Number(now);
    frameHandle = raf?.(onFrame) ?? null;
  }

  function start() {
    if (running) return false;
    running = true;
    lastFrameAt = null;
    if (raf) frameHandle = raf(onFrame);
    if (Observer) {
      try {
        observer = new Observer((list) => {
          for (const entry of list.getEntries()) {
            const duration = Math.max(0, Number(entry.duration) || 0);
            longTasks += 1;
            longTaskTotalMs += duration;
            maxLongTaskMs = Math.max(maxLongTaskMs, duration);
          }
        });
        observer.observe({ type: 'longtask', buffered: true });
      } catch {
        observer = null;
      }
    }
    return true;
  }

  function stop() {
    if (!running) return false;
    running = false;
    if (frameHandle !== null && caf) caf(frameHandle);
    frameHandle = null;
    lastFrameAt = null;
    observer?.disconnect?.();
    observer = null;
    return true;
  }

  function markRender(count = 1) {
    const value = Number(count);
    if (!Number.isInteger(value) || value < 1) throw new TypeError('render count must be a positive integer');
    renders += value;
  }

  function snapshot() {
    const averageFrameMs = frames ? frameTotalMs / frames : null;
    const memory = perf?.memory;
    return Object.freeze({
      running,
      frames,
      averageFrameMs,
      maxFrameMs: frames ? maxFrameMs : null,
      estimatedFps: averageFrameMs ? 1000 / averageFrameMs : null,
      longTasks,
      longTaskTotalMs,
      maxLongTaskMs: longTasks ? maxLongTaskMs : null,
      renders,
      domNodes: document?.getElementsByTagName ? document.getElementsByTagName('*').length : null,
      memory: Object.freeze({
        usedJSHeapSize: finite(memory?.usedJSHeapSize),
        totalJSHeapSize: finite(memory?.totalJSHeapSize),
        jsHeapSizeLimit: finite(memory?.jsHeapSizeLimit),
      }),
      support: Object.freeze({
        frameCadence: Boolean(raf),
        longTaskObserver: Boolean(Observer),
        memory: Boolean(memory),
        domNodes: Boolean(document?.getElementsByTagName),
      }),
    });
  }

  return Object.freeze({ start, stop, markRender, snapshot });
}
