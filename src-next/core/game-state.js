export const NEW_CORE_SCHEMA_VERSION = 1;

function u32(value) {
  return Number(value) >>> 0;
}

export function createInitialGameState({ runId, seed, party = [], bag = {}, money = 0 } = {}) {
  if (!runId) throw new Error('runId is required');
  const normalizedSeed = u32(seed ?? 0x6d2b79f5);
  return {
    schemaVersion: NEW_CORE_SCHEMA_VERSION,
    runId: String(runId),
    seed: normalizedSeed,
    rngState: normalizedSeed,
    day: 1,
    floor: 1,
    boundaryState: null,
    board: null,
    boardSelectionsRemaining: 0,
    location: 'day_board',
    mode: 'board',
    party: structuredClone(party),
    storage: [],
    bag: structuredClone(bag),
    money: Number(money) || 0,
    progressionFlags: {},
    eventFlags: {},
    facilityState: {},
    villageActionsRemaining: 0,
    activeEncounter: null,
    activeBattle: null,
    carryover: {},
    runStatus: 'active',
    diagnostics: { appliedResultIds: [] },
  };
}

export function cloneGameState(state) {
  return structuredClone(state);
}

export function assertSerializableGameState(state) {
  const encoded = JSON.stringify(state);
  if (!encoded) throw new Error('GameState is not serializable');
  const decoded = JSON.parse(encoded);
  if (decoded.schemaVersion !== NEW_CORE_SCHEMA_VERSION) throw new Error('Unsupported GameState schema');
  return decoded;
}
