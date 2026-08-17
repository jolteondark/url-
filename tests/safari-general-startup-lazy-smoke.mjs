import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  SAFARI_MOVE_MASTERS,
  SAFARI_SPECIES_MASTERS,
  safariGeneralMastersInstalled,
} from "../runtime/safari-playable-data.js";

assert.deepEqual(Object.keys(SAFARI_SPECIES_MASTERS).sort(), ["EEVEE", "PIKACHU", "RATTATA"]);
assert.ok(Object.keys(SAFARI_MOVE_MASTERS).length >= 700, "bootstrap keeps lightweight move-id coverage");
assert.equal(safariGeneralMastersInstalled(), false, "full GENERAL masters must not install during bootstrap");
assert.equal(SAFARI_MOVE_MASTERS.TACKLE.power, 40);
assert.equal(SAFARI_MOVE_MASTERS.QUICKATTACK.priority, 1);

const playableData = await readFile(new URL("../runtime/safari-playable-data.js", import.meta.url), "utf8");
const core = await readFile(new URL("../runtime/safari-playable-integration-core.js", import.meta.url), "utf8");
const wounded = await readFile(new URL("../runtime/safari-wounded-pokemon-integration.js", import.meta.url), "utf8");
const loader = await readFile(new URL("../runtime/safari-general-encounter-data-loader.js", import.meta.url), "utf8");
const deferred = await readFile(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");

assert.doesNotMatch(playableData, /^import .*safari-general-encounter-data-loader/m);
assert.doesNotMatch(core, /^import .*safari-general-encounter-runtime/m);
assert.doesNotMatch(core, /^import .*mapless-dynamic-trainer-generator/m);
assert.doesNotMatch(wounded, /safari-general-encounter-data-loader\.js/);
assert.match(core, /safariGeneralCombatReady/);
assert.match(deferred, /ensureSafariGeneralCombatData/);
assert.match(deferred, /normal_event.*wounded_pokemon/s);
assert.match(loader, /BROWSER_FETCH_BATCH = 4/);
assert.match(loader, /fetchEncodedChunk/);
assert.match(loader, /typeof window !== "undefined"/);

console.log("safari GENERAL startup lazy smoke: ok");
