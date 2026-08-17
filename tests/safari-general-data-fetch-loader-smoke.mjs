import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../runtime/safari-general-encounter-data-loader.js", import.meta.url),
  "utf8",
);

const chunkImports = [...source.matchAll(/from "\.\/generated\/safari-general-encounter-data-v2-(\d{2})\.js"/g)];
assert.equal(chunkImports.length, 20, "GENERAL loader must reference all 20 generated canonical payload chunks");
assert.deepEqual(
  chunkImports.map((match) => match[1]),
  Array.from({ length: 20 }, (_, index) => String(index).padStart(2, "0")),
  "GENERAL chunk imports must remain contiguous from 00 through 19",
);
assert.doesNotMatch(source, /fetch\(/, "GENERAL loader must not refetch JavaScript modules as text");
assert.doesNotMatch(source, /encodedChunkFromModuleSource/, "GENERAL loader must not parse export-default source strings");
assert.doesNotMatch(source, /import\(new URL\(path, import\.meta\.url\)\.href\)/, "generated payload imports are already explicit and must not have a second runtime import path");
assert.match(source, /const encoded = \[/);
assert.match(source, /new DecompressionStream\("deflate"\)/);

console.log("Safari GENERAL current import-graph smoke: ok");
