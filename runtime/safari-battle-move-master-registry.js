const registered = Object.create(null);
let revision = 0;
let cachedBase = null;
let cachedRevision = -1;
let cachedMerged = null;

export function registerSafariBattleMoveMasters(moveMasters, moveIds) {
  if (!moveMasters || typeof moveMasters !== "object" || Array.isArray(moveMasters)) {
    throw new TypeError("moveMasters object is required");
  }
  const ids = [...new Set(moveIds ?? [])];
  for (const id of ids) {
    const master = moveMasters[id];
    if (!master || master.id !== id) throw new RangeError(`missing battle move master: ${id}`);
    if (registered[id] !== master) {
      registered[id] = master;
      revision += 1;
    }
  }
  return ids.length;
}

export function safariBattleMoveMasters(baseMoveMasters) {
  if (!baseMoveMasters || typeof baseMoveMasters !== "object" || Array.isArray(baseMoveMasters)) {
    throw new TypeError("baseMoveMasters object is required");
  }
  if (cachedBase === baseMoveMasters && cachedRevision === revision && cachedMerged) return cachedMerged;
  cachedBase = baseMoveMasters;
  cachedRevision = revision;
  cachedMerged = Object.freeze({ ...baseMoveMasters, ...registered });
  return cachedMerged;
}

export function safariBattleRegisteredMoveIds() {
  return Object.freeze(Object.keys(registered));
}
