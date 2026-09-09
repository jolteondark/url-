import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../runtime/safari-normal-battle-round-pre-gems.js", import.meta.url), "utf8");

// A PP-restoring held Berry is committed after the resolved move action. If that actor is
// KO'd later in the same round and replaced, the activation must still commit exactly once
// to the round-start party slot rather than being discarded or applied to the replacement.
assert.doesNotMatch(source, /function applyPlayerBerry[\s\S]*?if \(result\?\.playerReplacementApplied\) return null;/);
assert.match(source, /const pokemon = party\?\.\[index\]/);
assert.match(source, /if \(committed\.resolution\.triggered\) party\[index\] = commitOntoCurrentPokemon\(pokemon, committed\.pokemon\)/);

assert.doesNotMatch(source, /function applyFoeBerry[\s\S]*?if \(result\?\.foeReplacementApplied\) return null;/);
assert.match(source, /const foeAtAction = trainerParty\?\.\[foeIndex\] \?\? battle\.foe/);
assert.match(source, /if \(trainerParty\?\.\[foeIndex\]\) trainerParty\[foeIndex\] = structuredClone\(committedPokemon\)/);
assert.match(source, /if \(!result\?\.foeReplacementApplied && battle\.foe\) battle\.foe = structuredClone\(committedPokemon\)/);

// Do not replace the active replacement snapshot with the old battler after committing.
assert.match(source, /!result\?\.playerReplacementApplied && playerRuntime/);
assert.match(source, /!result\?\.foeReplacementApplied && battle\?\.foe/);

console.log("battle held PP restore berry replacement smoke: ok");
