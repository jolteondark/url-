const DEFAULT_VALUE_IDS = Object.freeze([
  "player", "frame_count", "game_system", "pokemon_system", "switches", "variables",
  "self_switches", "game_screen", "map_factory", "game_player", "global_metadata",
  "map_metadata", "bag", "storage_system", "essentials_version", "game_version", "stats",
]);

function cloneValue(value) {
  if (value == null || typeof value !== "object") return value;
  return Array.isArray(value)
    ? value.map(cloneValue)
    : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]));
}

function requireObject(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${field} must be an object`);
  }
  return value;
}

function valueIds(options = {}) {
  const ids = options.valueIds ?? DEFAULT_VALUE_IDS;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || id.length === 0)) {
    throw new TypeError("valueIds must be an array of non-empty strings");
  }
  if (new Set(ids).size !== ids.length) throw new TypeError("valueIds must be unique");
  return ids;
}

export function compileSaveHash(runtimeState, options = {}) {
  const runtime = requireObject(runtimeState, "runtimeState");
  const ids = valueIds(options);
  const saveData = {};
  for (const id of ids) {
    if (!Object.hasOwn(runtime, id)) throw new TypeError(`missing registered save value: ${id}`);
    saveData[id] = cloneValue(runtime[id]);
  }
  return saveData;
}

export function saveRunState(runtimeState, options = {}) {
  const saveData = compileSaveHash(runtimeState, options);
  return {
    payload: JSON.stringify(saveData),
    saveData,
    operations: [
      { op: "compile_save_hash", valueIds: valueIds(options) },
      { op: "write_portable_payload" },
    ],
  };
}

export function readRunSave(payload) {
  if (typeof payload !== "string") throw new TypeError("payload must be a string");
  const saveData = JSON.parse(payload);
  requireObject(saveData, "saveData");
  return { saveData: cloneValue(saveData), operations: [{ op: "read_portable_payload" }] };
}

export function loadAllValues(saveData, runtimeState = {}, options = {}) {
  const save = requireObject(saveData, "saveData");
  const runtime = cloneValue(requireObject(runtimeState, "runtimeState"));
  const ids = valueIds(options);
  const loadedIds = new Set(options.loadedIds ?? []);
  const defaults = options.defaults ?? {};
  requireObject(defaults, "defaults");
  const operations = [];

  for (const id of ids) {
    if (loadedIds.has(id)) {
      operations.push({ op: "skip_loaded", id });
      continue;
    }
    if (Object.hasOwn(save, id)) {
      runtime[id] = cloneValue(save[id]);
      operations.push({ op: "load_value", id });
    } else if (Object.hasOwn(defaults, id)) {
      runtime[id] = cloneValue(defaults[id]);
      operations.push({ op: "load_new_game_value", id });
    }
  }
  return { state: runtime, operations };
}

export function loadRunState(payload, runtimeState = {}, options = {}) {
  const read = readRunSave(payload);
  const loaded = loadAllValues(read.saveData, runtimeState, options);
  return { state: loaded.state, saveData: read.saveData, operations: [...read.operations, ...loaded.operations] };
}

export { DEFAULT_VALUE_IDS };
