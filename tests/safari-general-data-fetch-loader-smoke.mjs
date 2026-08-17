import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../runtime/safari-general-encounter-data-loader.js", import.meta.url),
  "utf8",
);

assert.match(source, /const CHUNK_PATHS = Object\.freeze/, "GENERAL chunks should have one data path manifest");
assert.match(source, /async function fetchEncodedChunk\(path\)/, "Safari should fetch encoded chunks as static data");
assert.match(source, /fetch\(url, \{ cache: "force-cache", credentials: "same-origin" \}\)/, "Safari data fetch should use same-origin cacheable requests");
assert.match(source, /encodedChunkFromModuleSource/, "existing generated data files should be decoded without module execution");
assert.doesNotMatch(source, /const CHUNK_LOADERS = \[/, "Safari loader must not maintain twenty hand-written module loader functions");
assert.match(source, /typeof window !== "undefined"\s*\? await loadBrowserEncodedChunks\(\)\s*:\s*await loadNodeEncodedChunks\(\)/, "browser and Node loading strategies should remain explicit");
assert.match(source, /import\(new URL\(path, import\.meta\.url\)\.href\)/, "Node smoke path may still import generated modules directly");

console.log("Safari GENERAL data fetch loader smoke: ok");
