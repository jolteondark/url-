import assert from "node:assert/strict";
import { resolveBrowserBattleRound } from "../runtime/browser-battle-round-runtime.js";

const FIXED = "SEQ_FIXED";
const PRIORITY_FIXED = "SEQ_PRIORITY_FIXED";
const MOVE_MASTERS = Object.freeze({
  [FIXED]: Object.freeze({
    id: FIXED,
    name: "Sequential Fixed",
    category: "Physical",
    power: 0,
    accuracy: 100,
    total_pp: 10,
    priority: 0,
    type: "NORMAL",
    function_code: "FixedDamageUserLevel",
  }),
  [PRIORITY_FIXED]: Object.freeze({
    id: PRIORITY_FIXED,
    name: "Sequential Priority Fixed",
    category: "Physical",
    power: 0,
    accuracy: 100,
    total_pp: 10,
    priority: 1,
    type: "NORMAL",
    function_code: "FixedDamageUserLevel",
  }),
});

function pokemon({ species, level, hp, speed, moveId = FIXED, pp = 5 }) {
  return {
    species,
    level,
    hp,
    max_hp: Math.max(hp, 100),
    status: "NONE",
    types: ["NORMAL"],
    stats: {
      ATTACK: 50,
      DEFENSE: 50,
      SPECIAL_ATTACK: 50,
      SPECIAL_DEFENSE: 50,
      SPEED: speed,
    },
    moves: [{ id: moveId, pp, ppup: 0 }],
  };
}

function useMoveCount(result, action) {
  return (result.operations ?? []).filter((op) => op.op === "use_move" && Number(op.action) === action).length;
}

function cancelCount(result, action) {
  return (result.operations ?? []).filter((op) => op.op === "cancel_action" && Number(op.action) === action && op.reason === "actor_fainted").length;
}

// Fast player one-shots the only foe: the queued foe action never exists at commit time.
{
  const player = pokemon({ species: "EEVEE", level: 100, hp: 80, speed: 120 });
  const foe = pokemon({ species: "RATTATA", level: 10, hp: 20, speed: 40 });
  const playerHpBefore = player.hp;
  const foePpBefore = foe.moves[0].pp;
  const resolved = resolveBrowserBattleRound({
    player,
    foe,
    playerParty: [player],
    foeParty: [foe],
    selectedMoveId: FIXED,
    foeMoveId: FIXED,
    moveMasters: MOVE_MASTERS,
    playerRandomRoll: 0,
    foeRandomRoll: 0,
    combatRandomSeed: 1,
    priorityRandomSeed: 1,
  });
  assert.equal(resolved.decision, 1);
  assert.equal(resolved.foe.hp, 0);
  assert.equal(resolved.player.hp, playerHpBefore, "KOed foe must not deal queued damage");
  assert.equal(resolved.foe.moves[0].pp, foePpBefore, "KOed foe must not spend queued move PP");
  assert.equal(useMoveCount(resolved, 1), 0, "KOed foe must not emit use_move");
}

// Fast foe one-shots the only player: the queued player action must not spend PP or execute.
{
  const player = pokemon({ species: "EEVEE", level: 10, hp: 20, speed: 40 });
  const foe = pokemon({ species: "RATTATA", level: 100, hp: 80, speed: 120 });
  const playerPpBefore = player.moves[0].pp;
  const resolved = resolveBrowserBattleRound({
    player,
    foe,
    playerParty: [player],
    foeParty: [foe],
    selectedMoveId: FIXED,
    foeMoveId: FIXED,
    moveMasters: MOVE_MASTERS,
    playerRandomRoll: 0,
    foeRandomRoll: 0,
    combatRandomSeed: 1,
    priorityRandomSeed: 1,
  });
  assert.equal(resolved.decision, 2);
  assert.equal(resolved.player.hp, 0);
  assert.equal(resolved.player.moves[0].pp, playerPpBefore, "KOed player must not spend queued move PP");
  assert.equal(useMoveCount(resolved, 0), 0, "KOed player must not emit use_move");
}

// Nonlethal fast player: foe remains alive and acts exactly once.
{
  const player = pokemon({ species: "EEVEE", level: 5, hp: 80, speed: 120 });
  const foe = pokemon({ species: "RATTATA", level: 5, hp: 80, speed: 40 });
  const playerHpBefore = player.hp;
  const foePpBefore = foe.moves[0].pp;
  const resolved = resolveBrowserBattleRound({
    player,
    foe,
    playerParty: [player],
    foeParty: [foe],
    selectedMoveId: FIXED,
    foeMoveId: FIXED,
    moveMasters: MOVE_MASTERS,
    playerRandomRoll: 0,
    foeRandomRoll: 0,
    combatRandomSeed: 1,
    priorityRandomSeed: 1,
  });
  assert.equal(resolved.decision, 0);
  assert.ok(resolved.foe.hp > 0);
  assert.ok(resolved.player.hp < playerHpBefore, "living slower foe must still act");
  assert.equal(resolved.foe.moves[0].pp, foePpBefore - 1, "living slower foe spends PP exactly once");
  assert.equal(useMoveCount(resolved, 1), 1);
}

// Trainer-style active foe KO with a living reserve: decision remains 0, but the fainted active foe's queued action is cancelled.
{
  const player = pokemon({ species: "EEVEE", level: 100, hp: 80, speed: 120 });
  const activeFoe = pokemon({ species: "RATTATA", level: 10, hp: 20, speed: 40 });
  const reserve = pokemon({ species: "ZUBAT", level: 10, hp: 50, speed: 70 });
  const playerHpBefore = player.hp;
  const activePpBefore = activeFoe.moves[0].pp;
  const reservePpBefore = reserve.moves[0].pp;
  const resolved = resolveBrowserBattleRound({
    player,
    foe: activeFoe,
    playerParty: [player],
    foeParty: [activeFoe, reserve],
    playerActivePartyIndex: 0,
    foeActivePartyIndex: 0,
    selectedMoveId: FIXED,
    foeMoveId: FIXED,
    moveMasters: MOVE_MASTERS,
    playerRandomRoll: 0,
    foeRandomRoll: 0,
    combatRandomSeed: 1,
    priorityRandomSeed: 1,
  });
  assert.equal(resolved.decision, 0, "living trainer reserve keeps battle nonterminal");
  assert.equal(resolved.battleContinuationHandoff.foeReplacementRequired, true);
  assert.equal(resolved.player.hp, playerHpBefore, "fainted active foe cannot attack before replacement");
  assert.equal(resolved.foe.moves[0].pp, activePpBefore, "fainted active foe cannot spend queued PP");
  assert.equal(resolved.battleContinuationHandoff.foeParty[1].moves[0].pp, reservePpBefore, "reserve must not act in the KO round");
  assert.equal(useMoveCount(resolved, 1), 0);
  assert.equal(cancelCount(resolved, 1), 1, "queued fainted actor should expose one cancellation operation");
  assert.ok(!(resolved.operations ?? []).some((op) => op.op === "end_of_round_phase"), "replacement checkpoint must precede end-of-round processing");
}

// Priority beats raw speed, and a priority KO cancels the slower foe identically.
{
  const player = pokemon({ species: "EEVEE", level: 100, hp: 80, speed: 10, moveId: PRIORITY_FIXED });
  const foe = pokemon({ species: "RATTATA", level: 10, hp: 20, speed: 200 });
  const playerHpBefore = player.hp;
  const foePpBefore = foe.moves[0].pp;
  const resolved = resolveBrowserBattleRound({
    player,
    foe,
    playerParty: [player],
    foeParty: [foe],
    selectedMoveId: PRIORITY_FIXED,
    foeMoveId: FIXED,
    moveMasters: MOVE_MASTERS,
    playerRandomRoll: 0,
    foeRandomRoll: 0,
    combatRandomSeed: 1,
    priorityRandomSeed: 1,
  });
  assert.equal(resolved.decision, 1);
  assert.equal(resolved.player.hp, playerHpBefore);
  assert.equal(resolved.foe.moves[0].pp, foePpBefore);
  assert.equal(useMoveCount(resolved, 1), 0);
}

console.log("browser battle sequential action KO cancellation smoke: ok");
