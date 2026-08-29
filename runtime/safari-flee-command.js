import { resolveBrowserWildBattleCommand } from "./browser-battle-wild-command-handoff.js";
import {
  abortSafariBattleCommand,
  beginSafariBattleCommand,
  captureSafariBattleCommandAttempt,
  commitSafariBattleResolution,
} from "./safari-battle-orchestrator.js";
import { safariBattleCanRun } from "./safari-battle-run-constraint.js";
import { resolveSafariNormalWildOpponentResponse } from "./safari-normal-battle-round.js";

function browserRunSeed() {
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
    const value = new Uint32Array(1);
    globalThis.crypto.getRandomValues(value);
    return value[0] & 0x7fffffff;
  }
  return Math.floor(Math.random() * 0x80000000) & 0x7fffffff;
}

function postBattlePersistenceInput(runtime) {
  const party = structuredClone(runtime?.player?.party ?? []);
  return {
    party,
    caught: [],
    initialItems: [party.map((pokemon) => pokemon?.item ?? null), []],
  };
}

function activePartyIndex(battle, runtime) {
  const index = Number(battle?.player_party_index ?? 0);
  if (!Number.isInteger(index) || index < 0 || index >= (runtime?.player?.party?.length ?? 0)) {
    throw new RangeError("active player party index is outside the current Party");
  }
  return index;
}

function commitTerminalPlayer(runtime, terminalStateHandoff, partyIndex) {
  const reflected = terminalStateHandoff?.playerParty?.[partyIndex];
  if (!reflected || !runtime?.player?.party?.[partyIndex]) return;
  runtime.player.party[partyIndex] = structuredClone(reflected);
}

function fleePresentation(player, foe, resolved) {
  const escaped = resolved.result === 1 && resolved.decision === 3;
  const blocked = !escaped && resolved.result === 0;
  return {
    type: "flee",
    result: escaped ? "escaped" : (blocked ? "blocked" : "failed"),
    reason: resolved.reason ?? null,
    actor: "player",
    actorSpecies: player?.species ?? null,
    target: "foe",
    targetSpecies: foe?.species ?? null,
  };
}

export function attemptSafariFlee(runtime, {
  runRandomSeed = browserRunSeed(),
  randomRoll = undefined,
  certainEscapeByItem = false,
  commandKind = "flee",
} = {}) {
  const state = runtime?.variables?.mapless;
  const battle = state?.battle;
  if (!state || !battle || battle.completed) throw new Error("active battle is required");
  if (commandKind !== "flee" && commandKind !== "item") throw new RangeError(`unsupported flee command kind: ${commandKind}`);

  beginSafariBattleCommand(runtime, commandKind);
  const commandAttempt = captureSafariBattleCommandAttempt(runtime);
  try {
    const playerPartyIndex = activePartyIndex(battle, runtime);
    const player = runtime?.player?.party?.[playerPartyIndex];
    const foe = battle.foe;
    const trainerBattle = battle.kind === "trainer";
    const command = resolveBrowserWildBattleCommand({
      command: "run",
      player,
      foe,
      trainerBattle,
      decision: Number(battle.decision ?? 0),
      postBattlePersistenceInput: postBattlePersistenceInput(runtime),
      reflectedPartyIndex: playerPartyIndex,
      runInput: {
        internalBattle: true,
        canRun: safariBattleCanRun(runtime),
        duringBattle: false,
        runCommand: Number(battle.run_command ?? 0),
        moreTypeEffects: false,
        battlerHasGhostType: false,
        certainEscapeByAbility: false,
        certainEscapeByItem: Boolean(certainEscapeByItem),
        trappedInBattle: false,
        trappedByOpponentAbility: false,
        trappedByOpponentItem: false,
        runRandomSeed,
        randomRoll,
      },
    });
    const resolved = command.run;
    const presentation = fleePresentation(player, foe, resolved);
    battle.run_command = resolved.runCommand;

    const baseOperation = {
      op: "battle_flee",
      result: resolved.result,
      decision: resolved.decision,
      reason: resolved.reason,
      runCommand: resolved.runCommand,
      rate: resolved.rate,
      randomRoll: resolved.randomRoll,
      runRandomSeed: Number(runRandomSeed) & 0x7fffffff,
      certainEscapeByItem: Boolean(certainEscapeByItem),
    };

    if (resolved.result !== 1 || resolved.decision !== 3) {
      const blocked = resolved.result === 0;
      if (resolved.reason === "escape_failed") {
        const response = resolveSafariNormalWildOpponentResponse(runtime);
        const operations = [baseOperation, ...(response.operations ?? [])];
        battle.last_operations = operations;
        state.last_operations = operations;
        if (!battle.completed) state.notice = "逃げられなかった！";
        const result = {
          runtime,
          escaped: false,
          blocked: false,
          resolution: resolved,
          availability: command.availability,
          terminalStateHandoff: command.terminalStateHandoff,
          opponentResponse: response,
          decision: Number(response.decision ?? battle.decision ?? 0),
          playerReplacementRequired: Boolean(response.playerReplacementRequired),
          foeReplacementApplied: Boolean(response.foeReplacementApplied),
          turnConsumed: true,
          operations,
          presentation: [presentation, ...(response.presentation ?? [])],
          persistenceRequested: Boolean(response.persistenceRequested),
        };
        return commitSafariBattleResolution(runtime, result, commandKind, { commandAttempt });
      }
      state.notice = blocked ? "この戦闘からは逃げられない！" : "逃げられなかった！";
      const operations = [baseOperation];
      battle.last_operations = operations;
      state.last_operations = operations;
      const result = {
        runtime,
        escaped: false,
        blocked,
        resolution: resolved,
        availability: command.availability,
        terminalStateHandoff: command.terminalStateHandoff,
        decision: Number(battle.decision ?? 0),
        turnConsumed: false,
        operations,
        presentation: [presentation],
      };
      return commitSafariBattleResolution(runtime, result, commandKind, { commandAttempt });
    }

    commitTerminalPlayer(runtime, command.terminalStateHandoff, playerPartyIndex);
    state.last_terminal_wild = structuredClone(command.terminalStateHandoff);

    const index = Number(battle.board_index);
    if (Number.isInteger(index) && index >= 0) {
      if (Array.isArray(state.board_consumed) && index < state.board_consumed.length) state.board_consumed[index] = true;
      if (Array.isArray(state.board_visited) && index < state.board_visited.length) state.board_visited[index] = true;
    }

    const operations = [
      baseOperation,
      { op: "terminal_wild_state_committed", resultKind: command.terminalStateHandoff?.resultKind ?? "fled", playerPartyIndex },
      { op: "request_save", reason: "battle_flee" },
    ];
    battle.decision = 3;
    battle.return_target = "day_board";
    battle.last_operations = operations;
    state.notice = "うまく逃げ切った！";
    state.last_operations = operations;
    const result = {
      runtime,
      escaped: true,
      blocked: false,
      target: "day_board",
      decision: 3,
      turnConsumed: true,
      resolution: resolved,
      availability: command.availability,
      terminalStateHandoff: command.terminalStateHandoff,
      operations,
      presentation: [presentation],
      persistenceRequested: true,
    };
    return commitSafariBattleResolution(runtime, result, commandKind, { commandAttempt });
  } catch (error) {
    abortSafariBattleCommand(runtime, `${commandKind} flee failed:${error?.message ?? error}`, { commandAttempt });
    throw error;
  }
}
