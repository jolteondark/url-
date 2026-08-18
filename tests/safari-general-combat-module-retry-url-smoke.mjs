import assert from "node:assert/strict";
import fs from "node:fs";
import {
  safariGeneralCombatModuleSpecifier,
} from "../runtime/safari-general-retry-url.js";

assert.equal(
  safariGeneralCombatModuleSpecifier("wild", 0),
  "./safari-general-encounter-runtime.js",
  "first wild import must preserve the stable production URL",
);
assert.equal(
  safariGeneralCombatModuleSpecifier("trainer", 0),
  "./mapless-dynamic-trainer-generator.js",
  "first trainer import must preserve the stable production URL",
);
assert.equal(
  safariGeneralCombatModuleSpecifier("wild", 1),
  "./safari-general-encounter-runtime.js?retry=1",
  "a failed wild module import must retry with a fresh module identity",
);
assert.equal(
  safariGeneralCombatModuleSpecifier("trainer", 7),
  "./mapless-dynamic-trainer-generator.js?retry=7",
  "a failed trainer module import must retry with a fresh module identity",
);
assert.equal(
  safariGeneralCombatModuleSpecifier("wild", -4),
  "./safari-general-encounter-runtime.js",
  "negative retry generations must normalize to the initial URL",
);
assert.throws(
  () => safariGeneralCombatModuleSpecifier("both", 1),
  /unknown Safari GENERAL combat module kind/,
  "only event-specific combat modules own retry identities",
);

const demandSource = fs.readFileSync(
  new URL("../runtime/safari-general-data-demand.js", import.meta.url),
  "utf8",
);
assert.match(
  demandSource,
  /safariGeneralCombatModuleSpecifier\("wild", retryGeneration\)/,
  "wild selected-demand must use the retry-aware module specifier",
);
assert.match(
  demandSource,
  /safariGeneralCombatModuleSpecifier\("trainer", retryGeneration\)/,
  "trainer selected-demand must use the retry-aware module specifier",
);
assert.match(
  demandSource,
  /encounterRetryGeneration \+= 1/,
  "wild reject must advance the next retry generation",
);
assert.match(
  demandSource,
  /trainerRetryGeneration \+= 1/,
  "trainer reject must advance the next retry generation",
);
assert.match(
  demandSource,
  /next_retry_generation: encounterRetryGeneration/,
  "wild exact trace must retain the next retry generation",
);
assert.match(
  demandSource,
  /next_retry_generation: trainerRetryGeneration/,
  "trainer exact trace must retain the next retry generation",
);
assert.doesNotMatch(
  demandSource,
  /fallback/i,
  "retry must not introduce fallback data or a second truth source",
);

console.log("Safari GENERAL combat-module retry URL smoke: PASS");
