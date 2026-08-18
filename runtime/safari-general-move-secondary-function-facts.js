// Generated from canonical Mapless v0.9.108 PBS moves for the exact 608 GENERAL level-move closure.
// Source ZIP SHA-256: e35eecadc21535e57a4cd9946abfea9a52ed9268b12456e2934e0ef7eeabb1ab
import functionCodesAH from "./generated/safari-general-function-codes-a-h.js";
import functionCodesIR from "./generated/safari-general-function-codes-i-r.js";
import functionCodesSZ from "./generated/safari-general-function-codes-s-z.js";

const FUNCTION_CODES = Object.freeze({ ...functionCodesAH, ...functionCodesIR, ...functionCodesSZ });

export function safariGeneralSecondaryFunctionCodeV108(moveId) {
  const id = String(moveId ?? "");
  const functionCode = FUNCTION_CODES[id];
  if (typeof functionCode !== "string" || functionCode.length === 0) throw new RangeError(`unknown Safari GENERAL FunctionCode: ${id}`);
  return functionCode;
}

export function projectSafariGeneralSecondaryFunctionCodeV108(moveId, master) {
  if (!master || typeof master !== "object" || Array.isArray(master)) throw new TypeError("Safari GENERAL move master is required");
  const id = String(moveId ?? master.id ?? "");
  const functionCode = safariGeneralSecondaryFunctionCodeV108(id);
  if (master.function_code != null && String(master.function_code) !== functionCode) throw new Error(`Safari GENERAL move FunctionCode mismatch for ${id}`);
  return Object.freeze({ ...master, id, function_code: functionCode });
}

export const SAFARI_GENERAL_SECONDARY_FUNCTION_CODE_METADATA_V108 = Object.freeze({
  moveCount: Object.keys(FUNCTION_CODES).length,
  uniqueFunctionCodeCount: new Set(Object.values(FUNCTION_CODES)).size,
  projectionSha256: "5059325350a36ca4c78122f4b35e7c53e1927815b1a3fe14fda5280f178d88d8",
  canonicalFilteredCoreSha256: "e35eecadc21535e57a4cd9946abfea9a52ed9268b12456e2934e0ef7eeabb1ab",
});
if (Object.keys(FUNCTION_CODES).length !== 608) throw new Error("Safari GENERAL FunctionCode coverage mismatch");
