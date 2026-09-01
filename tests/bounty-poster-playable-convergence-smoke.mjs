import fs from "node:fs";
import assert from "node:assert/strict";

const owner = fs.readFileSync(new URL("../runtime/safari-bounty-poster-interaction.js", import.meta.url), "utf8");
const handoff = fs.readFileSync(new URL("../bounty-poster-owner-action-handoff.js", import.meta.url), "utf8");
const manifest = JSON.parse(fs.readFileSync(new URL("../board-presentation-manifest.json", import.meta.url), "utf8"));
const loader = fs.readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");

assert.match(owner, /resolveCanonicalNormalEvent\("bounty_poster"/,
  "Safari bounty poster must delegate mechanics to the canonical normal-event owner");
assert.match(owner, /operation\?\.op === "set_bounty"/,
  "Safari bounty poster must consume the canonical set_bounty operation");
assert.match(owner, /state\.mapless_bounty = structuredClone\(setBounty\.value\)/,
  "canonical bounty payload must be committed without rebuilding it in Safari");
assert.ok(!owner.includes("accepted_day:"), "Safari must not duplicate the canonical bounty payload schema");
assert.ok(!owner.includes("1800"), "Safari must not duplicate canonical bounty reward mechanics");
assert.match(handoff, /persistSafariOwnerResult\(current, result, window\.localStorage\)/,
  "bounty poster completion must use the shared owner-result persistence handoff");
assert.match(handoff, /stopImmediatePropagation\(\)/,
  "bounty poster Board/action delivery must not fall through to the unsupported legacy path");

const delivery = "./bounty-poster-owner-action-handoff.js?v=20260901-1327";
assert.ok(manifest.modules.includes(delivery), "no-store Board manifest must publish bounty poster handoff");
assert.ok(loader.includes(`\"${delivery}\"`), "Board manifest fallback must publish the same bounty poster handoff");

console.log("bounty poster playable convergence smoke: ok");
