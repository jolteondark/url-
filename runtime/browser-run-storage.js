import { loadAllValues, loadRunState, readRunSave, saveRunState } from "./run-persistence.js";

export const DEFAULT_RUN_SAVE_KEY = "mapless.run.v0.9.108";

function requireStorage(storage) {
  if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function" || typeof storage.removeItem !== "function") {
    throw new TypeError("storage must implement getItem/setItem/removeItem");
  }
  return storage;
}

export function hasStoredRun(storage, key = DEFAULT_RUN_SAVE_KEY) {
  const target = requireStorage(storage);
  return target.getItem(key) !== null;
}

export function persistRunState(storage, runtimeState, options = {}) {
  const target = requireStorage(storage);
  const key = options.key ?? DEFAULT_RUN_SAVE_KEY;
  const saved = saveRunState(runtimeState, options);
  target.setItem(key, saved.payload);
  return { ...saved, key, operations: [...saved.operations, { op: "storage_set", key }] };
}

export function restoreRunState(storage, runtimeState = {}, options = {}) {
  const target = requireStorage(storage);
  const key = options.key ?? DEFAULT_RUN_SAVE_KEY;
  const payload = target.getItem(key);
  if (payload === null) return { found: false, key, state: runtimeState, operations: [{ op: "storage_miss", key }] };
  const loaded = loadRunState(payload, runtimeState, options);
  return { found: true, key, ...loaded, operations: [{ op: "storage_get", key }, ...loaded.operations] };
}

export function restoreValidatedRunState(storage, runtimeState = {}, options = {}) {
  const target = requireStorage(storage);
  const rootKey = options.key ?? DEFAULT_RUN_SAVE_KEY;
  const validateSaveData = options.validateSaveData;
  if (typeof validateSaveData !== "function") throw new TypeError("validateSaveData must be a function");

  function loadAt(key) {
    const payload = target.getItem(key);
    if (payload === null) {
      return { found: false, state: runtimeState, loadedKey: null, operations: [{ op: "storage_miss", key }] };
    }
    const read = readRunSave(payload);
    const prefix = [
      { op: "storage_get", key },
      ...read.operations,
      { op: "validate_save_data", key },
    ];
    if (!validateSaveData(read.saveData)) {
      const backupKey = `${key}.bak`;
      const invalidOps = [...prefix, { op: "invalid_save", key }];
      if (target.getItem(backupKey) !== null) {
        const backup = loadAt(backupKey);
        return {
          ...backup,
          invalid: true,
          recoveredFromBackup: backup.found,
          operations: [
            ...invalidOps,
            { op: "backup_fallback", from: key, to: backupKey },
            ...backup.operations,
          ],
        };
      }
      return {
        found: false,
        state: runtimeState,
        loadedKey: null,
        invalid: true,
        recoveredFromBackup: false,
        needsDeletionPrompt: true,
        operations: [
          ...invalidOps,
          { op: "backup_miss", key: backupKey },
          { op: "prompt_save_deletion" },
        ],
      };
    }
    const loaded = loadAllValues(read.saveData, runtimeState, options);
    return {
      found: true,
      state: loaded.state,
      saveData: read.saveData,
      loadedKey: key,
      valid: true,
      recoveredFromBackup: key !== rootKey,
      operations: [...prefix, ...loaded.operations],
    };
  }

  return { key: rootKey, ...loadAt(rootKey) };
}

export function clearStoredRun(storage, key = DEFAULT_RUN_SAVE_KEY) {
  const target = requireStorage(storage);
  target.removeItem(key);
  return { key, operations: [{ op: "storage_remove", key }] };
}
