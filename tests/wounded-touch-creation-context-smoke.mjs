import assert from "node:assert/strict";
import fs from "node:fs";

const wounded = fs.readFileSync(new URL("../runtime/safari-wounded-pokemon-integration.js", import.meta.url), "utf8");
const touch = fs.readFileSync(new URL("../runtime/safari-normal-event-touch-handoff.js", import.meta.url), "utf8");

assert.match(
  wounded,
  /import \{ resolveSafariNewPokemonCreationContextV108 \} from "\.\/safari-new-pokemon-creation-context-v108\.js";/,
  "shared wounded Safari owner must reuse the canonical Safari creation-context resolver",
);
assert.match(
  wounded,
  /explicitCreationFormContext\(options\.creationFormContext\)[\s\S]*\? resolveSafariNewPokemonCreationContextV108\(runtime\) : undefined/,
  "unprepared wounded candidates must hydrate creation-form context at the shared owner boundary",
);
assert.match(
  touch,
  /prepareSafariWoundedPokemonCandidate\(runtime, index\)/,
  "common touch presentation must remain a thin caller and rely on the shared wounded owner for creation context",
);
assert.doesNotMatch(
  touch,
  /resolveSafariNewPokemonCreationContextV108/,
  "touch presentation must not become a second creation-context authority",
);

console.log("wounded touch creation-context smoke: ok");
