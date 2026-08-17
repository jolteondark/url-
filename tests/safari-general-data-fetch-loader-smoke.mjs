import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../runtime/safari-general-encounter-data-loader.js", import.meta.url),
  "utf8",
);

assert.match(source, /const CHUNK_PATHS = Object\.freeze/, "GENERAL chunks should have one data path manifest");
assert.match(source, /async function loadEncodedChunks\(\)/, "GENERAL chunks should use one module-loading path");
assert.match(source, /import\(new URL\(path, import\.meta\.url\)\.href\)/, "generated chunks should be loaded through the browser module loader");
assert.doesNotMatch(source, /fetch\(/, "GENERAL loader should not refetch JavaScript modules as text");
assert.doesNotMatch(source, /encodedChunkFromModuleSource/, "GENERAL loader should not parse export-default source strings");
assert.doesNotMatch(source, /loadBrowserEncodedChunks|loadNodeEncodedChunks/, "browser and Node should not maintain duplicate chunk adapters");
assert.doesNotMatch(source, /const CHUNK_LOADERS = \[/, "GENERAL loader must not maintain twenty hand-written module loader functions");

console.log("Safari GENERAL module loader demolition smoke: ok");
