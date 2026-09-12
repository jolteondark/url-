import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const boardSource = await readFile(new URL("../runtime/safari-pokemon-center-command.js", import.meta.url), "utf8");
const touchSource = await readFile(new URL("../normal-event-touch-presentation.js", import.meta.url), "utf8");

assert.match(
  boardSource,
  /import \{ safariOldStatuePresentation \} from "\.\/safari-old-statue-break-rewards\.js";/,
  "Day Board Old Statue entry must use the completed Old Statue owner chain",
);
assert.doesNotMatch(
  boardSource,
  /import \{ safariOldStatuePresentation \} from "\.\/safari-old-statue-interaction\.js";/,
  "Day Board Old Statue entry must not source presentation from the incomplete base owner",
);
assert.match(
  touchSource,
  /old_statue:"\.\/runtime\/safari-old-statue-break-rewards\.js\?v=20260828-2320"/,
  "shared touch resolution must remain on the completed Old Statue owner chain",
);

console.log("old statue board owner convergence smoke: ok");
