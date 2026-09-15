export function createSafariActionGate({ now = () => performance.now() } = {}) {
  if (typeof now !== 'function') throw new TypeError('Safari action gate clock must be a function');
  return {
    active: null,
    sequence: 0,
    accepted: 0,
    rejected: 0,
    completed: 0,
    cancelled: 0,
    totalDurationMs: 0,
    lastDurationMs: null,
    maxDurationMs: 0,
    now,
  };
}

export function beginSafariAction(gate, action) {
  assertGate(gate);
  if (!action || typeof action !== 'object' || Array.isArray(action) || !action.type) {
    throw new TypeError('Safari action requires an object with type');
  }
  if (gate.active) {
    gate.rejected += 1;
    return null;
  }

  const token = Object.freeze({ sequence: gate.sequence++ });
  gate.active = Object.freeze({ token, action: structuredClone(action), startedAtMs: gate.now() });
  gate.accepted += 1;
  return gate.active;
}

export function releaseSafariAction(gate, token) {
  assertGate(gate);
  if (!matchesActive(gate, token)) return false;
  const durationMs = elapsed(gate, gate.active.startedAtMs);
  gate.active = null;
  gate.completed += 1;
  gate.totalDurationMs += durationMs;
  gate.lastDurationMs = durationMs;
  gate.maxDurationMs = Math.max(gate.maxDurationMs, durationMs);
  return true;
}

export function cancelSafariAction(gate, token) {
  assertGate(gate);
  if (!matchesActive(gate, token)) return false;
  gate.active = null;
  gate.cancelled += 1;
  return true;
}

export function snapshotSafariActionGate(gate) {
  assertGate(gate);
  const activeDurationMs = gate.active ? elapsed(gate, gate.active.startedAtMs) : null;
  return Object.freeze({
    activeSequence: gate.active?.token.sequence ?? null,
    activeType: gate.active?.action.type ?? null,
    activeDurationMs,
    accepted: gate.accepted,
    rejected: gate.rejected,
    completed: gate.completed,
    cancelled: gate.cancelled,
    lastDurationMs: gate.lastDurationMs,
    maxDurationMs: gate.maxDurationMs,
    averageDurationMs: gate.completed ? gate.totalDurationMs / gate.completed : null,
  });
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
