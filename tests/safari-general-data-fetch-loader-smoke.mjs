import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../runtime/safari-general-encounter-data-loader.js", import.meta.url),
  "utf8",
);

assert.match(source, /const CHUNK_PATHS = Object\.freeze/, "GENERAL chunks should have one data path manifest");
assert.match(source, /const CHUNK_LOADERS = Object\.freeze\(CHUNK_PATHS\.map/, "GENERAL chunk loading should derive from the single path manifest");
assert.match(source, /import\(new URL\(path, import\.meta\.url\)\.href\)/, "browser and Node should share native module loading");
assert.doesNotMatch(source, /fetchEncodedChunk/, "runtime should not source-fetch generated JS modules");
assert.doesNotMatch(source, /encodedChunkFromModuleSource/, "runtime should not parse export syntax as text");
assert.doesNotMatch(source, /response\.text\(\)/, "runtime should not decode generated module source text");
assert.doesNotMatch(source, /loadBrowserEncodedChunks|loadNodeEncodedChunks/, "browser and Node loader adapters should not be duplicated");
assert.doesNotMatch(source, /safari-general-species-individual-facts\.js|safari-general-move-ai-facts\.js/, "GENERAL facts should not require side projection modules");
assert.match(source, /const GENDER_RATIO_INDEX_PACKED =/, "species individual facts should remain precomputed lookup data");
assert.match(source, /const TYPE_INDEX_PACKED =/, "move AI facts should remain precomputed lookup data");

console.log("Safari GENERAL native loader smoke: ok");
