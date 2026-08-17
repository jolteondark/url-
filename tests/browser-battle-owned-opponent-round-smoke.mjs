import assert from "node:assert/strict";
import { resolveBrowserBattleRoundWithOwnedOpponent } from "../runtime/browser-battle-round-owned-opponent-runtime.js";

const moveMasters = {
  TACKLE: {
    id: "TACKLE",
    name: "Tackle",
    type: "NORMAL",
    category: "Physical",
    power: 1,
    accuracy: 100,
    priority: 0,
    total_pp: 35,
  },
};

const pokemon = (species, hp) => ({
  species,
  level: 5,
  hp,
  max_hp: 20,
  status: "NONE",
  stats: {
    ATTACK: 10,
    DEFENSE: 10,
    SPECIAL_ATTACK: 10,
    SPECIAL_DEFENSE: 10,
    SPEED: 10,
  },
  moves: [{ id: "TACKLE", pp: 35, ppup: 0 }],
});

const player = pokemon("PLAYER", 20);
const foe = pokemon("FOE", 20);
const playerParty = [pokemon("RESERVE", 20), player];
const foeParty = [foe, pokemon("FOE_RESERVE", 20)];
const playerBattleExpInput = { marker: "exp-forwarded" };
const result = resolveBrowserBattleRoundWithOwnedOpponent({
  battleKind: "wild",
  player,
  foe,
  playerParty,
  foeParty,
  playerActivePartyIndex: 1,
  foeActivePartyIndex: 0,
  selectedMoveId: "TACKLE",
  moveMasters,
  foeAiRandomSeed: 1,
  combatRandomSeed: 123,
  priorityRandomSeed: 456,
  playerRandomRoll: 0,
  foeRandomRoll: 0,
  playerBattleExpInput,
  reflectedPartyIndex: 1,
});

assert.equal(result.opponentChoice.command, "move");
assert.equal(result.opponentChoice.moveId, "TACKLE");
assert.equal(result.combatRandomSeed, 123);
assert.equal(result.priorityRandomSeed, 456);
assert.equal(result.battleContinuationHandoff.playerActivePartyIndex, 1);
assert.equal(result.battleContinuationHandoff.foeActivePartyIndex, 0);
assert.ok(result.operations.some((operation) => operation.op === "use_move"));
assert.equal(result.battleRuntimeIntegration.partyAwareJudge, true);

console.log("browser Battle-owned opponent round smoke: PASS");
