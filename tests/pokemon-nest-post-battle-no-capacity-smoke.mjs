import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const adapter = fs.readFileSync(path.join(root, "runtime", "safari-pokemon-nest-interaction.js"), "utf8");

const continuation = adapter.match(/registerSafariNormalEventBattleContinuation\("pokemon_nest"[\s\S]*?\n\}\);/)?.[0] ?? "";
assert.ok(continuation, "Pokemon Nest must keep a registered Battle RETURN continuation");
assert.match(continuation,
  /if \(!granted\.success\) \{[\s\S]*?resolvePokemonNest\(\{[\s\S]*?action:"egg"[\s\S]*?battle_success:true,[\s\S]*?add_egg_success:false,[\s\S]*?\}\)/,
  "no-capacity victory must return through the canonical Pokemon Nest owner");
assert.match(continuation,
  /if \(!granted\.success\) \{[\s\S]*?commitOwner\(state, index, owner,[\s\S]*?request_save[\s\S]*?result:owner\.outcome,[\s\S]*?completed:true,[\s\S]*?terminal:true/,
  "canonical no-capacity outcome must consume the Board event and persist terminal completion");
assert.doesNotMatch(continuation,
  /result:"egg_storage_full"[\s\S]*?completed:false/,
  "a completed defensive Battle must not leave the Pokemon Nest re-enterable on storage failure");
assert.equal((continuation.match(/grantNormalEventHiddenEgg\(runtime,/g) ?? []).length, 1,
  "egg grant must be attempted exactly once on Battle RETURN");

console.log("Pokemon Nest post-Battle no-capacity smoke passed");
