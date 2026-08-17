import assert from "node:assert/strict";
import { buildBrowserBattleContinuationHandoff } from "../runtime/browser-battle-party-judge.js";

const player = { species: "EEVEE", level: 9, hp: 12, max_hp: 30, moves: [] };
const faintedFoe = { species: "RATTATA", level: 5, hp: 0, max_hp: 20, moves: [] };

const terminal = buildBrowserBattleContinuationHandoff({
  playerParty: [player],
  foeParty: [faintedFoe],
  playerPartyIndex: 0,
  foePartyIndex: 0,
  playerPokemon: player,
  foePokemon: faintedFoe,
  decision: 0,
});
assert.equal(terminal.decision, 1, "canonical judge must promote terminal foe KO to victory");
assert.equal(terminal.foeAllFainted, true);
assert.equal(terminal.foeReplacementRequired, false);

const reserve = { species: "ZUBAT", level: 5, hp: 15, max_hp: 15, moves: [] };
const replacement = buildBrowserBattleContinuationHandoff({
  playerParty: [player],
  foeParty: [faintedFoe, reserve],
  playerPartyIndex: 0,
  foePartyIndex: 0,
  playerPokemon: player,
  foePokemon: faintedFoe,
  decision: 0,
});
assert.equal(replacement.decision, 0, "nonterminal trainer KO must remain undecided");
assert.equal(replacement.foeReplacementRequired, true);

console.log("browser battle party judge terminal KO smoke: ok");
