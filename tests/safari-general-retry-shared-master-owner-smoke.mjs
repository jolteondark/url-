import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const wildSource = await readFile(new URL("../runtime/safari-general-encounter-runtime.js", import.meta.url), "utf8");
const trainerSource = await readFile(new URL("../runtime/mapless-dynamic-trainer-generator.js", import.meta.url), "utf8");
const sharedSource = await readFile(new URL("../runtime/safari-playable-data.js", import.meta.url), "utf8");

for (const [label, source] of [["wild", wildSource], ["trainer", trainerSource]]) {
  assert.equal(
    source.includes("safari-general-encounter-data-loader.js"),
    false,
    `${label} selected-demand module must not statically re-import the GENERAL loader`,
  );
  assert.ok(
    source.includes('from "./safari-playable-data.js"'),
    `${label} selected-demand module must consume the installed shared master owner`,
  );
  assert.ok(source.includes("safariCanonicalResetMoves"));
  assert.ok(source.includes("SAFARI_SPECIES_MASTERS"));
  assert.ok(source.includes("SAFARI_MOVE_MASTERS"));
}

assert.ok(
  sharedSource.includes("export function safariCanonicalResetMoves"),
  "canonical reset-moves lookup must live on the shared installed-master owner",
);
assert.ok(
  sharedSource.includes('if (!generalInstalled) throw new Error("Safari GENERAL masters are not installed")'),
  "selected reset-moves lookup must fail closed before canonical GENERAL masters are installed",
);

// Browser retry contract: the demand owner is the only production module that
// imports the retry-generation loader URL. Wild/trainer modules must remain
// downstream consumers of the already-installed shared lazy masters so a
// failed bare loader module-map entry cannot poison their retry import graph.
const demandSource = await readFile(new URL("../runtime/safari-general-data-demand.js", import.meta.url), "utf8");
assert.ok(demandSource.includes("safariGeneralLoaderSpecifier"));
assert.ok(demandSource.includes("safariGeneralCombatModuleSpecifier"));

console.log("Safari GENERAL retry shared-master owner smoke PASS");