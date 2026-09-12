import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const indexSource = await readFile(new URL("../index.html", import.meta.url), "utf8");
const boardSource = await readFile(new URL("../runtime/safari-pokemon-center-command.js", import.meta.url), "utf8");

assert.match(
  indexSource,
  /"\.\/runtime\/safari-pokemon-center-command\.js": "\.\/runtime\/safari-pokemon-center-command\.js\?v=20260912-1208"/,
  "served Safari must publish the post-#1534 Pokemon Center command generation",
);
assert.match(
  indexSource,
  /"\.\/runtime\/safari-old-statue-break-rewards\.js": "\.\/runtime\/safari-old-statue-break-rewards\.js\?v=20260912-1208"/,
  "served Safari must expose the completed Old Statue owner through the shared import map",
);
assert.match(
  boardSource,
  /import \{ safariOldStatuePresentation \} from "\.\/safari-old-statue-break-rewards\.js";/,
  "Day Board Old Statue presentation must remain on the completed owner chain",
);
assert.doesNotMatch(
  indexSource,
  /"\.\/runtime\/safari-pokemon-center-command\.js": "\.\/runtime\/safari-pokemon-center-command\.js\?v=20260911-1902"/,
  "public delivery must reject the pre-#1534 Pokemon Center command generation",
);

console.log("old statue board public delivery smoke: ok");
