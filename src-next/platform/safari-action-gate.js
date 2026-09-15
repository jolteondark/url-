export function createSafariActionGate({ now = () => performance.now(), slowActionThresholdMs = null } = {}) {
  if (typeof now !== 'function') throw new TypeError('Safari action gate clock must be a function');
  if (slowActionThresholdMs !== null && (!Number.isFinite(slowActionThresholdMs) || slowActionThresholdMs < 0)) {
    throw new TypeError('Safari slow action threshold must be a non-negative finite number or null');
  }
  return {
    active: null,
    sequence: 0,
    accepted: 0,
    rejected: 0,
    completed: 0,
    cancelled: 0,
    slowCompleted: 0,
    totalDurationMs: 0,
    lastDurationMs: null,
    maxDurationMs: 0,
    byType: Object.create(null),
    now,
    slowActionThresholdMs,
  };
}

export function beginSafariAction(gate, action) {
  assertGate(gate);
  if (!action || typeof action !== 'object' || Array.isArray(action) || !action.type) {
    throw new TypeError('Safari action requires an object with type');
  }
  const metrics = metricsFor(gate, action.type);
  if (gate.active) {
    gate.rejected += 1;
    metrics.rejected += 1;
    return null;
  }

  const token = Object.freeze({ sequence: gate.sequence++ });
  gate.active = Object.freeze({ token, action: structuredClone(action), startedAtMs: gate.now() });
  gate.accepted += 1;
  metrics.accepted += 1;
  return gate.active;
}

export function releaseSafariAction(gate, token) {
  assertGate(gate);
  if (!matchesActive(gate, token)) return false;
  const active = gate.active;
  const durationMs = elapsed(gate, active.startedAtMs);
  const metrics = metricsFor(gate, active.action.type);
  gate.active = null;
  gate.completed += 1;
  gate.totalDurationMs += durationMs;
  gate.lastDurationMs = durationMs;
  gate.maxDurationMs = Math.max(gate.maxDurationMs, durationMs);
  metrics.completed += 1;
  metrics.totalDurationMs += durationMs;
  metrics.lastDurationMs = durationMs;
  metrics.maxDurationMs = Math.max(metrics.maxDurationMs, durationMs);
  if (isSlow(gate, durationMs)) {
    gate.slowCompleted += 1;
    metrics.slowCompleted += 1;
  }
  return true;
}

export function cancelSafariAction(gate, token) {
  assertGate(gate);
  if (!matchesActive(gate, token)) return false;
  const metrics = metricsFor(gate, gate.active.action.type);
  gate.active = null;
  gate.cancelled += 1;
  metrics.cancelled += 1;
  return true;
}

export function snapshotSafariActionGate(gate) {
  assertGate(gate);
  const activeDurationMs = gate.active ? elapsed(gate, gate.active.startedAtMs) : null;
  return Object.freeze({
    activeSequence: gate.active?.token.sequence ?? null,
    activeType: gate.active?.action.type ?? null,
    activeDurationMs,
    activeSlow: activeDurationMs === null ? false : isSlow(gate, activeDurationMs),
    accepted: gate.accepted,
    rejected: gate.rejected,
    completed: gate.completed,
    cancelled: gate.cancelled,
    slowCompleted: gate.slowCompleted,
    slowActionThresholdMs: gate.slowActionThresholdMs,
    lastDurationMs: gate.lastDurationMs,
    maxDurationMs: gate.maxDurationMs,
    averageDurationMs: gate.completed ? gate.totalDurationMs / gate.completed : null,
    byType: snapshotByType(gate.byType),
  });
}

function metricsFor(gate, type) {
  return gate.byType[type] ||= {
    accepted: 0,
    rejected: 0,
    completed: 0,
    cancelled: 0,
    slowCompleted: 0,
    totalDurationMs: 0,
    lastDurationMs: null,
    maxDurationMs: 0,
  };
}

function snapshotByType(byType) {
  const snapshot = {};
  for (const [type, metrics] of Object.entries(byType)) {
    snapshot[type] = Object.freeze({
      accepted: metrics.accepted,
      rejected: metrics.rejected,
      completed: metrics.completed,
      cancelled: metrics.cancelled,
      slowCompleted: metrics.slowCompleted,
      lastDurationMs: metrics.lastDurationMs,
      maxDurationMs: metrics.maxDurationMs,
      averageDurationMs: metrics.completed ? metrics.totalDurationMs / metrics.completed : null,
    });
  }
  return Object.freeze(snapshot);
}

function assertGate(gate) {
  if (!gate || !Number.isInteger(gate.sequence) || typeof gate.now !== 'function') {
    throw new TypeError('Safari action gate is required');
  }
}

function matchesActive(gate, token) {
  return Boolean(gate.active && token && token.sequence === gate.active.token.sequence);
}

function elapsed(gate, startedAtMs) {
  return Math.max(0, gate.now() - startedAtMs);
}

function isSlow(gate, durationMs) {
  return gate.slowActionThresholdMs !== null && durationMs >= gate.slowActionThresholdMs;
}
