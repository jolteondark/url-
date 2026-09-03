import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const adapter = fs.readFileSync(path.join(root, "runtime", "safari-pokemon-nest-interaction.js"), "utf8");

assert.match(
  index,
  /"\.\/runtime\/safari-pokemon-nest-interaction\.js": "\.\/runtime\/safari-pokemon-nest-interaction\.js\?v=20260903-2200"/,
  "Safari import map must publish the post-#1170 Pokemon Nest interaction generation",
);
assert.match(
  adapter,
  /if \(!granted\.success\) \{[\s\S]*?resolvePokemonNest\(\{[\s\S]*?add_egg_success:false,[\s\S]*?\}\)[\s\S]*?completed:true,[\s\S]*?terminal:true/,
  "published Pokemon Nest adapter must include the canonical no-capacity terminal path",
);
assert.doesNotMatch(
  adapter,
  /result:"egg_storage_full"[\s\S]*?completed:false/,
  "published adapter must not regress to the stale re-enterable storage-full path",
);

console.log("Pokemon Nest public delivery smoke passed");
