export function createSafariActionGate() {
  return {
    active: null,
    sequence: 0,
    accepted: 0,
    rejected: 0,
  };
}

export function beginSafariAction(gate, action) {
  if (!gate || !Number.isInteger(gate.sequence)) throw new TypeError('Safari action gate is required');
  if (!action || typeof action !== 'object' || Array.isArray(action) || !action.type) {
    throw new TypeError('Safari action requires an object with type');
  }
  if (gate.active) {
    gate.rejected += 1;
    return null;
  }

  const token = Object.freeze({ sequence: gate.sequence++ });
  gate.active = Object.freeze({ token, action: structuredClone(action) });
  gate.accepted += 1;
  return gate.active;
}

export function releaseSafariAction(gate, token) {
  if (!gate || !Number.isInteger(gate.sequence)) throw new TypeError('Safari action gate is required');
  if (!gate.active) return false;
  if (!token || token.sequence !== gate.active.token.sequence) return false;
  gate.active = null;
  return true;
}

export function cancelSafariAction(gate, token) {
  return releaseSafariAction(gate, token);
}

export function snapshotSafariActionGate(gate) {
  if (!gate || !Number.isInteger(gate.sequence)) throw new TypeError('Safari action gate is required');
  return Object.freeze({
    activeSequence: gate.active?.token.sequence ?? null,
    activeType: gate.active?.action.type ?? null,
    accepted: gate.accepted,
    rejected: gate.rejected,
  });
}
