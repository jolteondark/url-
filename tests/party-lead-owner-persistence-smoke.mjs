import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { movePartyPokemonToLead } from "../runtime/party-order-management.js";

const preview = await readFile(new URL("../preview-app.js", import.meta.url), "utf8");
const handlerStart = preview.indexOf('window.addEventListener("safari-party-lead-request"');
assert.notEqual(handlerStart, -1, "Party lead request handler must remain reachable");
const handlerEnd = preview.indexOf('window.addEventListener("safari-runtime-changed"', handlerStart);
assert.notEqual(handlerEnd, -1, "Party lead handler boundary must remain detectable");
const handler = preview.slice(handlerStart, handlerEnd);

assert.match(handler, /setSafariPartyLead\(runtime,/);
assert.match(handler, /autoSaveIfRequested\(result, "Party lead auto-save"\)/);
assert.doesNotMatch(handler, /saveSafariPlayableRun\(/, "Party lead changes must not bypass shared owner-result persistence");

const first = { species: "PIKACHU" };
const second = { species: "EEVEE" };
const party = [first, second];
const changed = movePartyPokemonToLead(party, 1);
assert.equal(changed.changed, true);
assert.equal(changed.persistenceRequested, true);
assert.deepEqual(changed.operations, [{ op: "request_save", reason: "party_lead_change" }]);
assert.equal(party[0], second);

const unchanged = movePartyPokemonToLead(party, 0);
assert.equal(unchanged.changed, false);
assert.equal(unchanged.persistenceRequested, false);
assert.deepEqual(unchanged.operations, []);
assert.equal(party[0], second);

console.log("party lead owner persistence smoke: ok");
