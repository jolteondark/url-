import { shiftPresentationJob } from './semantic-event-queue.js';

function readClock(driver) {
  const value = Number(driver.now());
  if (!Number.isFinite(value)) throw new TypeError('presentation clock must return a finite number');
  return value;
}

function snapshotTypeMetrics(metrics) {
  return Object.freeze(Object.fromEntries(
    Object.entries(metrics).map(([type, value]) => [type, Object.freeze({
      completed: value.completed,
      lastDurationMs: value.lastDurationMs,
      maxDurationMs: value.maxDurationMs,
      averageDurationMs: value.completed > 0 ? value.totalDurationMs / value.completed : null,
    })])
  ));
}

export function createPresentationJobDriver(queue, options = {}) {
  if (!queue || !Array.isArray(queue.jobs)) throw new TypeError('presentation queue is required');
  const now = options.now ?? (() => globalThis.performance?.now?.() ?? Date.now());
  if (typeof now !== 'function') throw new TypeError('presentation clock must be a function');
  return {
    queue,
    active: null,
    completed: 0,
    now,
    metrics: {
      totalDurationMs: 0,
      maxDurationMs: 0,
      lastDurationMs: null,
      byType: Object.create(null),
    },
  };
}

export function beginNextPresentationJob(driver) {
  if (!driver || !driver.queue) throw new TypeError('presentation driver is required');
  if (driver.active) return null;

  const job = shiftPresentationJob(driver.queue);
  if (!job) return null;

  const token = Object.freeze({ sequence: job.sequence });
  driver.active = Object.freeze({ token, job, startedAtMs: readClock(driver) });
  return driver.active;
}

export function completePresentationJob(driver, token) {
  if (!driver || !driver.queue) throw new TypeError('presentation driver is required');
  if (!driver.active) return false;
  if (!token || token.sequence !== driver.active.token.sequence) return false;

  const durationMs = Math.max(0, readClock(driver) - driver.active.startedAtMs);
  const type = driver.active.job.event.type;
  driver.metrics.totalDurationMs += durationMs;
  driver.metrics.maxDurationMs = Math.max(driver.metrics.maxDurationMs, durationMs);
  driver.metrics.lastDurationMs = durationMs;
  const typeMetrics = driver.metrics.byType[type] ??= {
    completed: 0,
    totalDurationMs: 0,
    maxDurationMs: 0,
    lastDurationMs: null,
  };
  typeMetrics.completed += 1;
  typeMetrics.totalDurationMs += durationMs;
  typeMetrics.maxDurationMs = Math.max(typeMetrics.maxDurationMs, durationMs);
  typeMetrics.lastDurationMs = durationMs;
  driver.active = null;
  driver.completed += 1;
  return true;
}

export function snapshotPresentationJobDriver(driver) {
  if (!driver || !driver.queue) throw new TypeError('presentation driver is required');
  return Object.freeze({
    activeSequence: driver.active?.job.sequence ?? null,
    activeType: driver.active?.job.event.type ?? null,
    activeDurationMs: driver.active ? Math.max(0, readClock(driver) - driver.active.startedAtMs) : null,
    completed: driver.completed,
    pending: driver.queue.jobs.length,
    lastDurationMs: driver.metrics.lastDurationMs,
    maxDurationMs: driver.metrics.maxDurationMs,
    averageDurationMs: driver.completed > 0 ? driver.metrics.totalDurationMs / driver.completed : null,
    byType: snapshotTypeMetrics(driver.metrics.byType),
  });
}
