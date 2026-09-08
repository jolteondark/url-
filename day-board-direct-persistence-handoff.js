// Compatibility-only surface. Day Board persistence is owned by preview-app's
// owner-result handoff; this module must not observe clicks or poll operations.
export {
  ownerResultRequestsPersistence,
  persistSafariOwnerResult,
  requestsPersistence,
} from "./runtime/safari-owner-result-persistence.js";
