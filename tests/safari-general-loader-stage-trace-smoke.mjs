import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../runtime/safari-general-encounter-data-loader.js", import.meta.url), "utf8");

for (const stage of [
  "general_loader_chunk_batch_start",
  "general_loader_chunk_batch_ready",
  "general_loader_chunks_ready",
  "general_loader_base64_ready",
  "general_loader_decompress_start",
  "general_loader_decompress_ready",
  "general_loader_json_ready",
  "general_loader_projection_validated",
]) {
  assert.match(source, new RegExp(stage), `GENERAL loader trace must expose ${stage}`);
}
for (const stage of [
  "general_loader_chunk_batch_error",
  "general_loader_base64_error",
  "general_loader_decompression_unavailable",
  "general_loader_decompress_error",
  "general_loader_json_error",
]) {
  assert.match(source, new RegExp(stage), `GENERAL loader trace must preserve exact failure stage ${stage}`);
}
assert.match(source, /__maplessGeneralCombatTrace/, "loader stages must join the existing Battle-start GENERAL trace");
assert.doesNotMatch(source, /fallback Battle|fallbackBattle|fallback_battle/, "diagnostics must not introduce fallback Battle state");

console.log("Safari GENERAL loader exposes exact chunk/decode/decompress/JSON/projection Battle-start stages: ok");
