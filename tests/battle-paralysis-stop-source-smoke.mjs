import assert from "node:assert/strict";
import { tryUseMoveCanonical, TRY_USE_MOVE_BODY_SHA256 } from "../runtime/battle-core-try-use-move.js";
import { materializeSeededAccuracyDamageCanonical } from "../runtime/battle-core-seeded-accuracy-damage.js";
import { prepareCombatTurnInputCanonical } from "../runtime/battle-core-combat-turn.js";
import { buildBrowserBattleActionInput, resolveBrowserBattleRound } from "../runtime/browser-battle-round-runtime.js";

assert.equal(TRY_USE_MOVE_BODY_SHA256, "3b3525b6ff1c2c5cbbebdf4e1ac0939e5f7c5bf1d1bd772a45fcf75010b49911");
assert.equal(tryUseMoveCanonical({ status: "PARALYSIS", paralysisRoll4: 0 }).success, false);
assert.equal(tryUseMoveCanonical({ status: "PARALYSIS", paralysisRoll4: 1 }).success, true);
assert.equal(tryUseMoveCanonical({ status: "PARALYSIS", paralysisRoll4: 2 }).success, true);
assert.equal(tryUseMoveCanonical({ status: "PARALYSIS", paralysisRoll4: 3 }).success, true);

const action = {
  kind: "move",
  moveId: "TACKLE",
  moveIndex: 0,
  targetIndex: 1,
  accuracyInput: { baseAccuracy: 100 },
  useMoveInput: {
    moveId: "TACKLE",
    moveIndex: 0,
    targetIndex: 1,
    movePresent: true,
    tryUseMoveInput: { status: "PARALYSIS" },
  },
};

const seededStop = materializeSeededAccuracyDamageCanonical({ combatRandomSeed: 3, rounds: [{ actions: [action] }] });
assert.equal(seededStop.rounds[0].actions[0].useMoveInput.tryUseMoveInput.paralysisRoll4, 0);
assert.equal(seededStop.rounds[0].actions[0].accuracyInput.randomRoll, 24);
assert.equal(seededStop.rounds[0].actions[0].seededAccuracyDamageRolls[0].kind, "paralysis_stop");

const preparedStop = prepareCombatTurnInputCanonical({ combatRandomSeed: 3, rounds: [{ actions: [action] }] });
assert.equal(preparedStop.rounds[0].actions[0].tryUseMoveResolution.reason, "paralysis");
assert.equal(preparedStop.rounds[0].actions[0].moveSkipped, true);

// Existing accuracy/damage stream stays unchanged by the sibling move-use RNG.
const accuracyOnly = materializeSeededAccuracyDamageCanonical({
  combatRandomSeed: 1,
  rounds: [{ actions: [{ kind: "move", accuracyInput: { baseAccuracy: 100 }, damageInput: { damageMultiplierInput: { type: "NORMAL" } } }] }],
});
assert.equal(accuracyOnly.rounds[0].actions[0].accuracyInput.randomRoll, 37);
assert.equal(accuracyOnly.rounds[0].actions[0].damageInput.damageMultiplierInput.randomRoll, 11);

const moveMasters = {
  TACKLE: { id: "TACKLE", name: "Tackle", category: "Physical", power: 40, accuracy: 100, total_pp: 35, priority: 0, type: "NORMAL" },
};
const pokemon = (status, speed) => ({
  species: "EEVEE",
  level: 50,
  hp: 100,
  max_hp: 100,
  status,
  types: ["NORMAL"],
  stats: { ATTACK: 100, DEFENSE: 100, SPECIAL_ATTACK: 100, SPECIAL_DEFENSE: 100, SPEED: speed },
  moves: [{ id: "TACKLE", pp: 35, ppup: 0 }],
});

const ordinaryAction = buildBrowserBattleActionInput({
  actor: pokemon("PARALYSIS", 100),
  target: pokemon("NONE", 60),
  move: moveMasters.TACKLE,
  moveIndex: 0,
  battlerIndex: 0,
  targetBattlerIndex: 1,
  reflectPp: true,
});
assert.equal(ordinaryAction.useMoveInput.tryUseMoveInput.status, "PARALYSIS", "ordinary action must feed persisted paralysis into canonical try-use");

const ordinaryRound = resolveBrowserBattleRound({
  player: pokemon("PARALYSIS", 100),
  foe: pokemon("NONE", 60),
  playerParty: [pokemon("PARALYSIS", 100)],
  foeParty: [pokemon("NONE", 60)],
  selectedMoveId: "TACKLE",
  foeMoveId: "TACKLE",
  moveMasters,
  combatRandomSeed: 3,
  priorityRandomSeed: 1,
});
const ordinaryTrace = ordinaryRound.battleRuntimeIntegration.combatTrace.rounds[0];
assert.equal(ordinaryTrace.actions[0].tryUseMoveResolution.reason, "paralysis");
assert.equal(ordinaryTrace.actions[0].moveSkipped, true, "full paralysis must skip the selected player move");
assert.equal(ordinaryRound.foe.hp, 100, "a fully paralyzed player must not damage the foe");
assert.ok(ordinaryRound.player.hp < 100, "the foe must still act once during the same ordinary round");
assert.equal(ordinaryRound.decision, 0);
assert.equal(ordinaryRound.battleRuntimeIntegration.awaitingNextRound, true, "one input must resolve exactly one nonterminal round");

console.log(JSON.stringify({ ok: true, canonicalParalysisRoll4: true, seed3Stops: true, establishedAccuracyTranscriptPreserved: true, ordinaryRoundWired: true }));