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
      slowCompleted: value.slowCompleted,
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
  const slowJobThresholdMs = options.slowJobThresholdMs ?? null;
  if (slowJobThresholdMs !== null && (!Number.isFinite(slowJobThresholdMs) || slowJobThresholdMs < 0)) {
    throw new TypeError('slow presentation job threshold must be a non-negative finite number or null');
  }
  return {
    queue,
    active: null,
    completed: 0,
    cancelled: 0,
    now,
    slowJobThresholdMs,
    metrics: {
      totalDurationMs: 0,
      maxDurationMs: 0,
      lastDurationMs: null,
      slowCompleted: 0,
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
  const slow = driver.slowJobThresholdMs !== null && durationMs >= driver.slowJobThresholdMs;
  driver.metrics.totalDurationMs += durationMs;
  driver.metrics.maxDurationMs = Math.max(driver.metrics.maxDurationMs, durationMs);
  driver.metrics.lastDurationMs = durationMs;
  if (slow) driver.metrics.slowCompleted += 1;
  const typeMetrics = driver.metrics.byType[type] ??= {
    completed: 0,
    slowCompleted: 0,
    totalDurationMs: 0,
    maxDurationMs: 0,
    lastDurationMs: null,
  };
  typeMetrics.completed += 1;
  if (slow) typeMetrics.slowCompleted += 1;
  typeMetrics.totalDurationMs += durationMs;
  typeMetrics.maxDurationMs = Math.max(typeMetrics.maxDurationMs, durationMs);
  typeMetrics.lastDurationMs = durationMs;
  driver.active = null;
  driver.completed += 1;
  return true;
}

export function cancelPresentationJob(driver, token) {
  if (!driver || !driver.queue) throw new TypeError('presentation driver is required');
  if (!driver.active) return false;
  if (!token || token.sequence !== driver.active.token.sequence) return false;

  driver.active = null;
  driver.cancelled += 1;
  return true;
}

export function snapshotPresentationJobDriver(driver) {
  if (!driver || !driver.queue) throw new TypeError('presentation driver is required');
  const activeDurationMs = driver.active ? Math.max(0, readClock(driver) - driver.active.startedAtMs) : null;
  return Object.freeze({
    activeSequence: driver.active?.job.sequence ?? null,
    activeType: driver.active?.job.event.type ?? null,
    activeDurationMs,
    activeSlow: activeDurationMs !== null && driver.slowJobThresholdMs !== null
      ? activeDurationMs >= driver.slowJobThresholdMs
      : false,
    completed: driver.completed,
    cancelled: driver.cancelled,
    pending: driver.queue.jobs.length,
    slowJobThresholdMs: driver.slowJobThresholdMs,
    slowCompleted: driver.metrics.slowCompleted,
    lastDurationMs: driver.metrics.lastDurationMs,
    maxDurationMs: driver.metrics.maxDurationMs,
    averageDurationMs: driver.completed > 0 ? driver.metrics.totalDurationMs / driver.completed : null,
    byType: snapshotTypeMetrics(driver.metrics.byType),
  });
}
