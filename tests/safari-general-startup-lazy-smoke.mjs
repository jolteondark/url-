import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  SAFARI_MOVE_MASTERS,
  SAFARI_SPECIES_MASTERS,
  safariGeneralMastersInstalled,
} from "../runtime/safari-playable-data.js";

assert.deepEqual(Object.keys(SAFARI_SPECIES_MASTERS).sort(), ["EEVEE", "PIKACHU", "RATTATA"]);
assert.deepEqual(Object.keys(SAFARI_MOVE_MASTERS).sort(), ["BITE", "QUICKATTACK", "SWIFT", "TACKLE", "THUNDERSHOCK"]);
assert.equal(safariGeneralMastersInstalled(), false, "full GENERAL masters must not install during bootstrap");
assert.equal(SAFARI_MOVE_MASTERS.TACKLE.power, 40);
assert.equal(SAFARI_MOVE_MASTERS.QUICKATTACK.priority, 1);

const playableData = await readFile(new URL("../runtime/safari-playable-data.js", import.meta.url), "utf8");
const core = await readFile(new URL("../runtime/safari-playable-integration-core.js", import.meta.url), "utf8");
const wounded = await readFile(new URL("../runtime/safari-wounded-pokemon-integration.js", import.meta.url), "utf8");
const woundedPool = await readFile(new URL("../runtime/safari-wounded-general-species-pool-v108.js", import.meta.url), "utf8");
const loader = await readFile(new URL("../runtime/safari-general-encounter-data-loader.js", import.meta.url), "utf8");
const demand = await readFile(new URL("../runtime/safari-general-data-demand.js", import.meta.url), "utf8");

assert.doesNotMatch(playableData, /^import .*safari-general-encounter-data-loader/m);
assert.doesNotMatch(core, /^import .*safari-general-encounter-runtime/m);
assert.doesNotMatch(core, /^import .*mapless-dynamic-trainer-generator/m);
assert.doesNotMatch(wounded, /safari-general-encounter-data-loader\.js/);
assert.doesNotMatch(woundedPool, /safari-general-encounter-data-loader\.js/);
assert.match(woundedPool, /SAFARI_SPECIES_MASTERS/);
assert.match(core, /safariGeneralCombatReady/);

assert.match(loader, /lazyMasterProjection/);
assert.match(loader, /safariGeneralMaterializedMasterCounts/);
assert.doesNotMatch(loader, /SAFARI_GENERAL_SPECIES_MASTERS = Object\.freeze\(Object\.fromEntries/);
assert.doesNotMatch(loader, /SAFARI_GENERAL_MOVE_MASTERS = Object\.freeze\(Object\.fromEntries/);
assert.match(demand, /combatLoading = Promise\.all/);
assert.doesNotMatch(demand, /combatLoading = ensureSafariGeneralData\(\)/);

console.log("safari GENERAL startup lazy smoke: ok");
