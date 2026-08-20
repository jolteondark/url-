import assert from "node:assert/strict";
import fs from "node:fs";
import {
  createSafariPlayableRuntime,
  resolveSafariBattleRound,
  resolveSafariBoundaryPlayerReplacement,
  returnSafariToDayBoard,
} from "../runtime/safari-playable-integration.js";
import { startSafariBoundaryTrialBattle } from "../runtime/safari-boundary-trial-start.js";

const moveId = (move) => typeof move === "string" ? move : move?.id;
const clone = (value) => structuredClone(value);

const runtime = createSafariPlayableRuntime();
const reserve = clone(runtime.player.party[0]);
reserve.hp = Math.max(1, Number(reserve.max_hp ?? reserve.hp ?? 1));
reserve.fainted = false;
reserve.active = false;
reserve.name = `${reserve.name ?? reserve.species ?? "Reserve"} Boundary Reserve`;
runtime.player.party.push(reserve);

const state = runtime.variables.mapless;
state.day = 10;
state.location = "boundary_trial";
state.boundary_trial = {
  day: 10,
  leader_bag: ["MISTY", "SURGE", "ERIKA", "KOGA", "SABRINA", "BLAINE", "GREEN"],
  last_leader: null,
  pending_leader: "BROCK",
  trial_count: 0,
  trial_started: false,
  trial_cleared: false,
  trial_floor: 10,
  result: "preparation_required",
};
startSafariBoundaryTrialBattle(runtime);

runtime.player.party[0] = {
  ...runtime.player.party[0],
  hp: 1,
  stats: { ...runtime.player.party[0].stats, SPEED: 1 },
};
const bulldoze = state.battle.foe.moves.find((move) => moveId(move) === "BULLDOZE");
assert.ok(bulldoze, "BROCK lead must expose canonical BULLDOZE for the KO continuation fixture");
const overpoweringLead = {
  ...state.battle.foe,
  hp: state.battle.foe.max_hp,
  stats: { ...state.battle.foe.stats, ATTACK: 9999, SPEED: 9999 },
  moves: [clone(bulldoze)],
};
state.battle.foe = clone(overpoweringLead);
state.battle.trainer_party[0] = clone(overpoweringLead);

const koRound = resolveSafariBattleRound(runtime, "TACKLE");
assert.equal(koRound.decision, 0);
assert.equal(koRound.playerReplacementRequired, true,
  "a real boundary round KO with a living reserve must stop for player replacement");
assert.equal(state.battle.player_replacement_required, true);
assert.equal(state.battle.phase, "REPLACEMENT");
assert.equal(runtime.player.party[0].hp, 0);
assert.equal(state.battle.completed, false);
assert.equal(state.location, "boundary_trial");
assert.equal(koRound.operations.some((operation) =>
  (operation.op === "faint" || operation.op === "faint_self") && operation.target === "player"), true);

const pending = resolveSafariBoundaryPlayerReplacement(runtime);
const legalOptions = (pending.playerReplacementContinuation?.replacementOptions ?? [])
  .filter((option) => option?.canSwitchIn);
assert.equal(pending.result, "replacement_selection_required");
assert.equal(legalOptions.some((option) => Number(option.partyIndex) === 1), true,
  "boundary replacement owner must project the living reserve even when the battle snapshot has no cached UI options");

const presentationSource = fs.readFileSync(new URL("../battle-player-replacement-presentation.js", import.meta.url), "utf8");
assert.match(presentationSource, /function replacementOptions\(/);
assert.match(presentationSource, /resolveSafariBoundaryPlayerReplacement\(runtime\)/,
  "Safari replacement presentation must query the boundary owner when cached replacement options are absent");
assert.match(presentationSource, /\.filter\(\(option\) => option\?\.canSwitchIn\)/,
  "Safari replacement presentation must expose only legal boundary switch-in options");

const switched = resolveSafariBoundaryPlayerReplacement(runtime, 1);
assert.equal(switched.result, "continued_with_replacement");
assert.equal(switched.playerReplacementApplied, true);
assert.equal(state.battle.player_party_index, 1);
assert.equal(state.battle.phase, "COMMAND");
assert.equal(state.battle.replacement_checkpoint?.side, "player");
assert.equal(state.battle.replacement_checkpoint?.committed, true);

runtime.player.party[1] = {
  ...runtime.player.party[1],
  hp: runtime.player.party[1].max_hp,
  stats: {
    ...runtime.player.party[1].stats,
    ATTACK: 9999,
    DEFENSE: 9999,
    SPECIAL_DEFENSE: 9999,
    SPEED: 9999,
  },
};

let safety = 0;
while (!state.battle.completed && safety < 5) {
  safety += 1;
  const foeIndex = Number(state.battle.trainer_party_index ?? 0);
  state.battle.foe.hp = 1;
  state.battle.trainer_party[foeIndex].hp = 1;
  const active = runtime.player.party[state.battle.player_party_index];
  const selectedMove = moveId(active.moves[0]);
  const result = resolveSafariBattleRound(runtime, selectedMove);
  if (!state.battle.completed) {
    assert.equal(result.decision, 0);
    assert.equal(state.battle.phase, "COMMAND",
      "after the player replacement, each surviving boundary reserve transition must return to COMMAND");
  }
}

assert.equal(state.battle.completed, true, "replacement continuation must be able to finish the boundary trial");
assert.equal(state.battle.decision, 1);
assert.equal(state.battle.phase, "RESULT");
assert.equal(state.boundary_trial.result, "victory_returned_to_board");
assert.equal(state.boundary_trial.last_leader, "BROCK");

const returned = returnSafariToDayBoard(runtime);
assert.equal(returned.target, "day_board");
assert.equal(returned.phase, "RETURN");
assert.equal(returned.persistenceRequested, true);
assert.equal(returned.operations.filter((operation) => operation?.op === "request_save").length, 1);
assert.equal(state.day, 11);
assert.equal(state.location, "day_board");
assert.equal(state.battle, null);
assert.equal(state.board_events.length, 8);

console.log("Safari boundary real player KO -> replacement -> COMMAND -> victory -> Board: PASS");
