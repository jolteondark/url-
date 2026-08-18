import { resolveBrowserWildBattleCommand } from "./browser-battle-wild-command-handoff.js";
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

export function attemptSafariFlee(runtime, { runRandomSeed = browserRunSeed(), randomRoll = undefined } = {}) {
  const state = runtime?.variables?.mapless;
  const battle = state?.battle;
  if (!state || !battle || battle.completed) throw new Error("active battle is required");

  const playerPartyIndex = activePartyIndex(battle, runtime);
  const player = runtime?.player?.party?.[playerPartyIndex];
  const foe = battle.foe;
  const trainerBattle = battle.kind === "trainer";
  const facilityBlocked = battle.origin === "village_bounty";
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
      canRun: battle.kind === "wild" && !facilityBlocked,
      duringBattle: false,
      runCommand: Number(battle.run_command ?? 0),
      moreTypeEffects: false,
      battlerHasGhostType: false,
      certainEscapeByAbility: false,
      certainEscapeByItem: false,
      trappedInBattle: false,
      trappedByOpponentAbility: false,
      trappedByOpponentItem: false,
      runRandomSeed,
      randomRoll,
    },
  });
  const resolved = command.run;
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
  };

  if (resolved.result !== 1 || resolved.decision !== 3) {
    const blocked = resolved.result === 0;
    if (resolved.reason === "escape_failed") {
      const response = resolveSafariNormalWildOpponentResponse(runtime);
      const operations = [baseOperation, ...(response.operations ?? [])];
      battle.last_operations = operations;
      state.last_operations = operations;
      if (!battle.completed) state.notice = "逃げられなかった！";
      return {
        runtime,
        escaped: false,
        blocked: false,
        resolution: resolved,
        availability: command.availability,
        terminalStateHandoff: command.terminalStateHandoff,
        opponentResponse: response,
        operations,
        presentation: response.presentation ?? [],
        persistenceRequested: Boolean(response.persistenceRequested),
      };
    }
    state.notice = blocked ? "この戦闘からは逃げられない！" : "逃げられなかった！";
    const operations = [baseOperation];
    battle.last_operations = operations;
    state.last_operations = operations;
    return {
      runtime,
      escaped: false,
      blocked,
      resolution: resolved,
      availability: command.availability,
      terminalStateHandoff: command.terminalStateHandoff,
      operations,
      presentation: [],
      persistenceRequested: false,
    };
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
    { op: "return_to_day_board" },
    { op: "request_save", reason: "battle_flee" },
  ];
  state.battle = null;
  state.location = "day_board";
  state.notice = "うまく逃げ切った！";
  state.last_operations = operations;
  return {
    runtime,
    escaped: true,
    blocked: false,
    target: "day_board",
    resolution: resolved,
    availability: command.availability,
    terminalStateHandoff: command.terminalStateHandoff,
    operations,
    presentation: [],
    persistenceRequested: true,
  };
}
