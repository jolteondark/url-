import assert from "node:assert/strict";
import { movePartyPokemonToLead } from "../runtime/party-order-management.js";

const eevee = { species: "EEVEE" };
const rattata = { species: "RATTATA" };
const party = [eevee, rattata];

const changed = movePartyPokemonToLead(party, 1);
assert.equal(changed.changed, true);
assert.equal(changed.persistenceRequested, true);
assert.deepEqual(changed.operations, [{ op: "request_save", reason: "party_lead_change" }]);
assert.equal(party[0], rattata);

const unchanged = movePartyPokemonToLead(party, 0);
assert.equal(unchanged.changed, false);
assert.equal(unchanged.persistenceRequested, false);
assert.deepEqual(unchanged.operations, []);

console.log("party lead owner persistence smoke: ok");
