function randomUint32() {
  const crypto = globalThis.crypto;
  if (crypto && typeof crypto.getRandomValues === "function") {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] >>> 0;
  }
  return Math.floor(Math.random() * 0x100000000) >>> 0;
}

function mix32(value) {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b);
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

function maplessStateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("runtime variables.mapless state is required");
  }
  return state;
}

export function ensureSafariEncounterSeed(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("mapless state is required");
  }
  if (!Number.isInteger(state.preview_encounter_seed)) {
    state.preview_encounter_seed = randomUint32();
  }
  if (!Number.isInteger(state.preview_encounter_counter) || state.preview_encounter_counter < 0) {
    state.preview_encounter_counter = 0;
  }
  return state.preview_encounter_seed >>> 0;
}

function nextSafariSharedRunUint32(state, contextMix = 0) {
  const seed = ensureSafariEncounterSeed(state);
  const counter = state.preview_encounter_counter >>> 0;
  state.preview_encounter_counter = counter + 1;
  return mix32(
    seed
      ^ (Number(contextMix) >>> 0)
      ^ Math.imul((counter + 1) >>> 0, 0xc2b2ae35),
  );
}

export function borrowSafariSharedRunRandomInt(runtime, limit) {
  const max = Number(limit);
  if (!Number.isSafeInteger(max) || max <= 0 || max > 0x100000000) {
    throw new RangeError("shared run randomInt limit must be 1..2^32");
  }
  const state = maplessStateOf(runtime);
  if (max === 0x100000000) return nextSafariSharedRunUint32(state);
  const cutoff = Math.floor(0x100000000 / max) * max;
  while (true) {
    const value = nextSafariSharedRunUint32(state);
    if (value < cutoff) return value % max;
  }
}

export function nextSafariEncounterSpeciesIndex(state, { day, boardIndex } = {}) {
  if (!Number.isInteger(day) || day < 1) throw new RangeError("day must be >= 1");
  if (!Number.isInteger(boardIndex) || boardIndex < 0) throw new RangeError("boardIndex must be >= 0");
  const contextMix = Math.imul(day >>> 0, 0x9e3779b1)
    ^ Math.imul((boardIndex + 1) >>> 0, 0x85ebca6b);
  return nextSafariSharedRunUint32(state, contextMix);
}
