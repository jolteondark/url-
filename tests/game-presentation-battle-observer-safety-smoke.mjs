import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../game-presentation.js", import.meta.url), "utf8");

assert.match(
  source,
  /observe\(battle,\{subtree:true,childList:true,characterData:true\}\)/,
  "battle presentation must observe semantic child/text changes only",
);
assert.doesNotMatch(
  source,
  /observe\(battle,[^\n]*attributes:true/,
  "battle presentation must not observe attributes on Safari",
);
assert.doesNotMatch(
  source,
  /observe\(battle,[^\n]*(style|hidden)/,
  "battle presentation must not subscribe to style/hidden mutations",
);

console.log("game presentation battle observer safety smoke: ok");
