import AF from "./generated/safari-canonical-move-function-codes-af.js";
import GM from "./generated/safari-canonical-move-function-codes-gm.js";
import NS from "./generated/safari-canonical-move-function-codes-ns.js";
import TZ from "./generated/safari-canonical-move-function-codes-tz.js";

// Generated from canonical Mapless v0.9.108 PBS moves.
// Source ZIP SHA-256: e35eecadc21535e57a4cd9946abfea9a52ed9268b12456e2934e0ef7eeabb1ab
const FUNCTION_CODE_BY_MOVE = Object.freeze({ ...AF, ...GM, ...NS, ...TZ });

export function safariCanonicalMoveFunctionCodeV108(moveId) {
  const id = String(moveId ?? "");
  const value = FUNCTION_CODE_BY_MOVE[id];
  if (value === undefined) throw new RangeError(`unknown canonical Safari move function code: ${id}`);
  return value;
}

export function projectSafariCanonicalMoveFunctionCodeV108(moveId, master) {
  if (!master || typeof master !== "object" || Array.isArray(master)) throw new TypeError("Safari move master is required");
  const id = String(moveId ?? master.id ?? "");
  const functionCode = safariCanonicalMoveFunctionCodeV108(id);
  if (master.function_code != null && String(master.function_code) !== functionCode) {
    throw new Error(`Safari move function-code mismatch for ${id}: ${master.function_code}/${functionCode}`);
  }
  return Object.freeze({ ...master, function_code: functionCode });
}

export const SAFARI_CANONICAL_MOVE_FUNCTION_CODE_METADATA_V108 = Object.freeze({
  moveCount: Object.keys(FUNCTION_CODE_BY_MOVE).length,
  functionCodeCount: new Set(Object.values(FUNCTION_CODE_BY_MOVE)).size,
  projectionSha256: "980fcee639c1f0afa93f280bdcbf897d4d833b5bb6851c0343458da4de19208b",
  canonicalFilteredCoreSha256: "e35eecadc21535e57a4cd9946abfea9a52ed9268b12456e2934e0ef7eeabb1ab",
});
if (SAFARI_CANONICAL_MOVE_FUNCTION_CODE_METADATA_V108.moveCount !== 850) throw new Error("canonical Safari move function-code coverage mismatch");
