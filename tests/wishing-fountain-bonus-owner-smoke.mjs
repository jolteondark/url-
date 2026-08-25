import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const flow = fs.readFileSync(path.join(root, "runtime", "mapless-wishing-fountain-flow.js"), "utf8");
const pokemon = fs.readFileSync(path.join(root, "runtime", "pokemon-runtime.js"), "utf8");

assert.match(flow, /choose_pokemon',allow_fainted:true,allow_egg:false/,
  "v0.9.108 choose_pokemon(true) means fainted allowed while eggs remain excluded");
assert.doesNotMatch(flow, /choose_pokemon',allow_egg:true/,
  "Wishing Fountain must not mis-project canonical choose_pokemon(true) as egg eligibility");
assert.match(pokemon, /export function addPokemonRuntimeMaplessBonusStat\(/,
  "shared Pokemon Runtime must remain the canonical Mapless permanent bonus owner");
assert.match(pokemon, /return setPokemonRuntimeMaplessBonusStat\(current, key, Math\.max\(bonuses\[key\] \+ delta, 0\), calcInput\)/,
  "bonus owner must delegate stat recalculation through the existing setter");
assert.match(pokemon, /key === "HP"[\s\S]*?current\.hp[\s\S]*?normalized - previous\.HP/,
  "HP bonus increase must preserve the canonical live-HP +delta behavior");

console.log("Wishing Fountain canonical bonus-owner/source alignment smoke passed");
