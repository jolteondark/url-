import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalBattlebackPublishedPath } from "../runtime/canonical-battleback-sources.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "canonical-battleback-message-bridge.js"), "utf8");

assert.equal(
  canonicalBattlebackPublishedPath("field_message.png"),
  "assets/canonical-battlebacks/field_message.png"
);
assert.match(source, /canonicalBattlebackPublishedPath\(CANONICAL_FIELD_MESSAGE\)/);
assert.match(source, /new URL\(path, import\.meta\.url\)\.href/);
assert.doesNotMatch(source, /const CANONICAL_FIELD_MESSAGE = "\.\/assets\//);
assert.match(source, /removeProperty\("background-image"\)/);

console.log("canonical battleback message resolver smoke: ok");
