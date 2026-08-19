import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../battle-dppt-menu-flow-guard.js", import.meta.url), "utf8");

assert.match(source, /current\.phase !== "COMMAND" \|\| \(tab !== "party" && tab !== "bag"\)/,
  "Battle game menu must reject every non-command tab outside the explicit Party/Bag action surfaces");
assert.match(source, /lockMenuToBattlePurpose\(tab\)/,
  "Battle Party/Bag must remain owned by the command-menu integration");
assert.doesNotMatch(source, /tab === "box"|tab !== "box"/,
  "Storage Box must not gain a Battle-specific action path outside the orchestrator");

console.log("Safari Battle COMMAND menu excludes Storage Box from the action surface: PASS");
