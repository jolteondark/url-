function u32(value) { return Number(value) >>> 0; }

// Mulberry32-style state transition. Gameplay callers persist only nextState.
export function nextGameplayRandom(rngState) {
  const nextState = u32(rngState + 0x6d2b79f5);
  let t = nextState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, nextState };
}

export function randomInt(rngState, maxExclusive) {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) throw new Error('maxExclusive must be a positive integer');
  const { value, nextState } = nextGameplayRandom(rngState);
  return { value: Math.floor(value * maxExclusive), nextState };
}
