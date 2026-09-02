import assert from "node:assert/strict";
import fs from "node:fs";

import { safariBattleCanRun } from "../runtime/safari-battle-run-constraint.js";

const combatStart = fs.readFileSync(new URL("../runtime/safari-web-combat-start.js", import.meta.url), "utf8");

assert.doesNotMatch(
  combatStart,
  /unsupported[^\n]*cannot_run|\["cannot_run",\s*"strong_ai"\]/,
  "normal-event trainer adapter must not fail-close cannot_run after selecting trainer Battle kind",
);

const runtime = {
  variables: {
    mapless: {
      battle: {
        kind: "trainer",
        origin: "normal_event",
      },
    },
  },
};

assert.equal(
  safariBattleCanRun(runtime),
  false,
  "shared RUN owner must reject every trainer/non-wild Battle without a bounty-specific rule",
);

console.log("normal-event trainer cannot_run shared owner smoke: ok");
