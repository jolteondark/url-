import { saveSafariPlayableRun } from "./safari-web-startup.js";

function requestsPersistence(operations) {
  return Array.isArray(operations)
    && operations.some((operation) => operation?.op === "request_save");
}

function ownerResultRequestsPersistence(result) {
  return Boolean(result?.persistenceRequested) || requestsPersistence(result?.operations);
}

function persistSafariOwnerResult(runtime, result, storage = globalThis.localStorage) {
  if (!runtime || !ownerResultRequestsPersistence(result)) return null;
  return saveSafariPlayableRun(storage, runtime);
}

export {
  ownerResultRequestsPersistence,
  persistSafariOwnerResult,
  requestsPersistence,
};
