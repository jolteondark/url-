import { resolveRunCanonical } from "./battle-core-run-flee.js";

function browserRunSeed() {
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
    const value = new Uint32Array(1);
    globalThis.crypto.getRandomValues(value);
    return value[0] & 0x7fffffff;
  }
  return Math.floor(Math.random() * 0x80000000) & 0x7fffffff;
}

function speedOf(pokemon) {
  const value = Number(pokemon?.stats?.SPEED ?? 0);
  return Number.isFinite(value) ? value : 0;
}

export function attemptSafariFlee(runtime, { runRandomSeed = browserRunSeed() } = {}) {
  const state = runtime?.variables?.mapless;
  const battle = state?.battle;
  if (!state || !battle || battle.completed) throw new Error("active battle is required");

  const player = runtime?.player?.party?.[0];
  const foe = battle.foe;
  const trainerBattle = battle.kind === "trainer";
  const facilityBlocked = battle.origin === "village_bounty";
  const resolved = resolveRunCanonical({
    battlerOpposes: false,
    trainerBattle,
    internalBattle: true,
    canRun: battle.kind === "wild" && !facilityBlocked,
    duringBattle: false,
    decision: Number(battle.decision ?? 0),
    runCommand: Number(battle.run_command ?? 0),
    speedPlayer: speedOf(player),
    opponentSpeeds: [speedOf(foe)],
    moreTypeEffects: false,
    battlerHasGhostType: false,
    certainEscapeByAbility: false,
    certainEscapeByItem: false,
    trappedInBattle: false,
    trappedByOpponentAbility: false,
    trappedByOpponentItem: false,
    runRandomSeed,
  });
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
    state.notice = blocked ? "この戦闘からは逃げられない！" : "逃げられなかった！";
    const operations = [baseOperation];
    battle.last_operations = operations;
    state.last_operations = operations;
    return { runtime, escaped: false, blocked, resolution: resolved, operations };
  }

  const index = Number(battle.board_index);
  if (Number.isInteger(index) && index >= 0) {
    if (Array.isArray(state.board_consumed) && index < state.board_consumed.length) state.board_consumed[index] = true;
    if (Array.isArray(state.board_visited) && index < state.board_visited.length) state.board_visited[index] = true;
  }

  const operations = [
    baseOperation,
    { op: "return_to_day_board" },
    { op: "request_save", reason: "battle_flee" },
  ];
  state.battle = null;
  state.location = "day_board";
  state.notice = "うまく逃げ切った！";
  state.last_operations = operations;
  return { runtime, escaped: true, blocked: false, target: "day_board", resolution: resolved, operations };
}
