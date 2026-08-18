import assert from "node:assert/strict";
import fs from "node:fs";
import {
  safariGeneralChunkImportUrl,
  safariGeneralLoaderSpecifier,
} from "../runtime/safari-general-retry-url.js";

const source = fs.readFileSync(new URL("../runtime/safari-general-encounter-data-loader.js", import.meta.url), "utf8");
const demandSource = fs.readFileSync(new URL("../runtime/safari-general-data-demand.js", import.meta.url), "utf8");

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

// A rejected ES module URL can stay failed in WebKit's module map for the rest
// of the page session. Retry must therefore request fresh URLs without changing
// the canonical payload or inventing fallback data.
assert.equal(safariGeneralLoaderSpecifier(0), "./safari-general-encounter-data-loader.js");
assert.equal(safariGeneralLoaderSpecifier(1), "./safari-general-encounter-data-loader.js?retry=1");
assert.equal(safariGeneralLoaderSpecifier(2), "./safari-general-encounter-data-loader.js?retry=2");
const retryLoaderUrl = "https://example.test/runtime/safari-general-encounter-data-loader.js?retry=7";
assert.equal(
  safariGeneralChunkImportUrl("./generated/safari-general-encounter-data-v2-03.js", retryLoaderUrl),
  "https://example.test/runtime/generated/safari-general-encounter-data-v2-03.js?retry=7",
  "retry generation must propagate to chunk URLs so a failed chunk URL is not reused",
);
assert.equal(
  safariGeneralChunkImportUrl("./generated/safari-general-encounter-data-v2-03.js", retryLoaderUrl.replace("?retry=7", "")),
  "https://example.test/runtime/generated/safari-general-encounter-data-v2-03.js",
  "first demand must preserve the existing canonical chunk URL",
);
assert.match(demandSource, /generalDataRetryGeneration \+= 1/, "failed GENERAL demand must advance retry generation");
assert.match(demandSource, /safariGeneralLoaderSpecifier\(retryGeneration\)/, "retry must request a fresh loader module URL");
assert.match(source, /safariGeneralChunkImportUrl\(path, import\.meta\.url\)/, "retry generation must propagate from loader URL to chunk import URLs");

// test:battle-entry ends with this smoke. Keep post-render Battle runtime
// readiness in the same blocker gate as GENERAL load and the complete vertical.
await import("./safari-battle-runtime-prewarm-smoke.mjs");

console.log("Safari GENERAL loader exposes exact stages and retry-safe loader/chunk module URLs: ok");
