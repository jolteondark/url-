import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const boundary = await readFile(new URL("../runtime/safari-playable-integration-boundary.js", import.meta.url), "utf8");
const wounded = await readFile(new URL("../runtime/safari-playable-integration-wounded.js", import.meta.url), "utf8");
const woundedOwner = await readFile(new URL("../runtime/safari-wounded-pokemon-integration.js", import.meta.url), "utf8");
const identity = await readFile(new URL("../runtime/mapless-player-identity-v108.js", import.meta.url), "utf8");
const context = await readFile(new URL("../runtime/safari-new-pokemon-creation-context-v108.js", import.meta.url), "utf8");

for (const modulePath of [
  "safari-playable-integration-wounded.js",
  "mapless-player-identity-v108.js",
  "safari-new-pokemon-creation-context-v108.js",
]) {
  assert.match(index, new RegExp(`\\.\\/runtime\\/${modulePath.replaceAll(".", "\\.")}\\?v=20260912-0900`));
}
assert.match(index, /\.\/runtime\/safari-wounded-pokemon-integration\.js\?v=20260912-1000/);
assert.doesNotMatch(index, /\.\/runtime\/safari-wounded-pokemon-integration\.js\?v=20260904-1900/);
assert.match(boundary, /import \* as base from "\.\/safari-playable-integration-wounded\.js";/);
assert.match(wounded, /ensureMaplessPlayerIdentityV108/);
assert.match(wounded, /resolveSafariNewPokemonCreationContextV108/);
assert.match(wounded, /prepareSafariWoundedPokemonCandidate\(runtime, index, \{ creationFormContext \}\)/);
assert.match(woundedOwner, /import \{ resolveSafariNewPokemonCreationContextV108 \} from "\.\/safari-new-pokemon-creation-context-v108\.js";/);
assert.match(woundedOwner, /explicitCreationFormContext\(options\.creationFormContext\)[\s\S]*\? resolveSafariNewPokemonCreationContextV108\(runtime\) : undefined/);
assert.match(identity, /export function ensureMaplessPlayerIdentityV108/);
assert.match(identity, /export function maplessPlayerSecretIdV108/);
assert.match(context, /maplessPlayerSecretIdV108\(runtime\.player\)/);
assert.match(context, /environment: MAPLESS_SAFARI_MAP001_ENVIRONMENT_V108/);
assert.match(context, /dayNight: creationDayNight\(now\)/);

console.log("wounded creation-context public generation smoke: ok");
