import assert from "node:assert/strict";
import fs from "node:fs";

const trainer = fs.readFileSync(new URL("../runtime/mapless-dynamic-trainer-generator.js", import.meta.url), "utf8");
const encounter = fs.readFileSync(new URL("../runtime/safari-general-encounter-runtime.js", import.meta.url), "utf8");
const deleted = new URL("../runtime/safari-general-master-subset-install.js", import.meta.url);

assert.equal(fs.existsSync(deleted), false, "deleted GENERAL subset wrapper must stay deleted");
assert.doesNotMatch(trainer, /safari-general-master-subset-install\.js/);
assert.doesNotMatch(encounter, /safari-general-master-subset-install\.js/);
assert.match(trainer, /SAFARI_MOVE_MASTERS, SAFARI_SPECIES_MASTERS/);
assert.match(trainer, /Object\.assign\(SAFARI_SPECIES_MASTERS/);
assert.match(trainer, /Object\.assign\(SAFARI_MOVE_MASTERS/);

console.log("Safari deleted GENERAL subset import: PASS");
