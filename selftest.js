const statusNode = document.getElementById("status");
const runsNode = document.getElementById("runs");
const detailNode = document.getElementById("detail");
const results = [];

function moveId(move) { return typeof move === "string" ? move : move?.id; }
function check(condition, message) { if (!condition) throw new Error(message); }
function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  const row = document.createElement("div");
  row.className = "run";
  const title = document.createElement("strong");
  title.textContent = `${ok ? "PASS" : "FAIL"} · ${name}`;
  const text = document.createElement("span");
  text.textContent = detail;
  row.append(title, text);
  runsNode.append(row);
}

async function startBattle(web, kind) {
  const runtime = web.createSafariPlayableRuntime();
  const state = runtime.variables.mapless;
  state.board_events[0] = kind === "wild"
    ? { kind: "wild", type: "BUG", slot: 0 }
    : { kind: "trainer", trainer_seed: 12345, slot: 0 };
  state.board_revealed[0] = true;
  state.board_consumed[0] = false;
  state.board_visited[0] = false;
  state.battle = null;
  state.location = "day_board";
  const started = await web.activateSafariDayBoardCell(runtime, 0);
  check(started.result === "dispatched", `${kind}: Board cell did not dispatch (${started.result})`);
  check(state.battle && !state.battle.completed, `${kind}: Battle state was not created`);
  return { runtime, state };
}

async function wildVertical(web) {
  const { runtime, state } = await startBattle(web, "wild");
  const battle = state.battle;
  const playerIndex = Number(battle.player_party_index ?? 0);
  const player = runtime.player.party[playerIndex];
  const selectedMoveId = moveId(player.moves[0]);
  check(selectedMoveId, "wild: no player move");

  player.max_hp = Math.max(500, Number(player.max_hp ?? 1));
  player.hp = player.max_hp;
  Object.assign(player.stats, { ATTACK: 1, SPECIAL_ATTACK: 1, DEFENSE: 999, SPECIAL_DEFENSE: 999, SPEED: 999 });
  battle.foe.max_hp = Math.max(500, Number(battle.foe.max_hp ?? 1));
  battle.foe.hp = battle.foe.max_hp;
  Object.assign(battle.foe.stats, { ATTACK: 1, SPECIAL_ATTACK: 1, DEFENSE: 999, SPECIAL_DEFENSE: 999 });

  const moveBefore = runtime.player.party[playerIndex].moves.find((entry) => moveId(entry) === selectedMoveId);
  const ppBefore = typeof moveBefore === "object" && moveBefore ? Number(moveBefore.pp) : null;
  const first = await web.resolveSafariBattleRound(runtime, selectedMoveId);
  check(first.decision === 0, `wild: first turn unexpectedly terminal (${first.decision})`);
  check(state.battle.turn === 2, `wild: turn did not advance (${state.battle.turn})`);
  const hpAfterFirst = Number(runtime.player.party[playerIndex].hp);
  check(hpAfterFirst > 0, "wild: player fainted in durable turn");
  check(Number(state.battle.foe.hp) > 0 && Number(state.battle.foe.hp) < Number(state.battle.foe.max_hp), "wild: foe HP did not persist after first turn");
  if (ppBefore !== null) {
    const afterMove = runtime.player.party[playerIndex].moves.find((entry) => moveId(entry) === selectedMoveId);
    check(Number(afterMove?.pp) === ppBefore - 1, `wild: PP carryover mismatch (${ppBefore} -> ${afterMove?.pp})`);
  }

  Object.assign(runtime.player.party[playerIndex].stats, { ATTACK: 999, SPECIAL_ATTACK: 999 });
  state.battle.foe.hp = 1;
  const second = await web.resolveSafariBattleRound(runtime, selectedMoveId);
  check(second.decision === 1, `wild: KO did not resolve victory (${second.decision})`);
  check(state.battle.completed === true, "wild: terminal Battle not completed");
  check(state.board_consumed[0] === true, "wild: Board event not consumed after victory");
  check(Number(runtime.player.party[playerIndex].hp) <= hpAfterFirst, "wild: HP healed between turns");

  const returned = await web.returnSafariToDayBoard(runtime);
  check(returned.result === "returned", `wild: return result ${returned.result}`);
  check(state.battle === null && state.location === "day_board", "wild: did not return cleanly to Board");
  return `2 turns, PP carryover, KO, Board return`;
}

async function trainerVertical(web) {
  const { runtime, state } = await startBattle(web, "trainer");
  const battle = state.battle;
  const playerIndex = Number(battle.player_party_index ?? 0);
  const player = runtime.player.party[playerIndex];
  const selectedMoveId = moveId(player.moves[0]);
  check(selectedMoveId, "trainer: no player move");

  player.max_hp = Math.max(500, Number(player.max_hp ?? 1));
  player.hp = player.max_hp;
  Object.assign(player.stats, { ATTACK: 999, SPECIAL_ATTACK: 999, DEFENSE: 999, SPECIAL_DEFENSE: 999, SPEED: 999 });

  const firstFoe = structuredClone(battle.foe);
  const secondFoe = structuredClone(battle.foe);
  for (const foe of [firstFoe, secondFoe]) {
    foe.hp = 1;
    foe.fainted = false;
    Object.assign(foe.stats, { ATTACK: 1, SPECIAL_ATTACK: 1 });
  }
  battle.trainer_party = [firstFoe, secondFoe];
  battle.trainer_party_index = 0;
  battle.trainer_party_order = [0, 1];
  battle.foe = structuredClone(firstFoe);

  const first = await web.resolveSafariBattleRound(runtime, selectedMoveId);
  check(first.decision === 0, `trainer: intermediate KO became terminal (${first.decision})`);
  check(state.battle.completed === false, "trainer: intermediate KO completed Battle");
  check(state.board_consumed[0] === false, "trainer: intermediate KO consumed Board event");
  check(Number(state.battle.trainer_party_index) === 1, `trainer: replacement index ${state.battle.trainer_party_index}`);
  check(Number(state.battle.foe.hp) > 0, "trainer: reserve foe not activated");

  state.battle.foe.hp = 1;
  state.battle.trainer_party[1].hp = 1;
  const final = await web.resolveSafariBattleRound(runtime, selectedMoveId);
  check(final.decision === 1, `trainer: final KO did not resolve victory (${final.decision})`);
  check(state.battle.completed === true, "trainer: final KO did not complete Battle");
  check(state.board_consumed[0] === true, "trainer: final victory did not consume Board event");
  check(Number(state.battle.trainer_exp_gained ?? 0) + Number(state.battle.exp_gained ?? 0) > 0, "trainer: accumulated EXP missing");

  const returned = await web.returnSafariToDayBoard(runtime);
  check(returned.result === "returned", `trainer: return result ${returned.result}`);
  check(state.battle === null && state.location === "day_board", "trainer: did not return cleanly to Board");
  return `2 foes, replacement, accumulated EXP, final KO, Board return`;
}

async function main() {
  const startedAt = performance.now();
  let web;
  try {
    web = await import("./runtime/safari-web-playable-integration.js");
    record("ES module graph import", true, "shared public facade loaded");
  } catch (error) {
    record("ES module graph import", false, error?.message ?? String(error));
    throw error;
  }

  for (const [name, run] of [["Wild vertical", wildVertical], ["Trainer vertical", trainerVertical]]) {
    try {
      const detail = await run(web);
      record(name, true, detail);
    } catch (error) {
      record(name, false, error?.stack ?? error?.message ?? String(error));
    }
  }

  const passed = results.every((entry) => entry.ok);
  const elapsedMs = Math.round(performance.now() - startedAt);
  const report = {
    passed,
    elapsedMs,
    userAgent: navigator.userAgent,
    results,
    lastError: globalThis.__maplessLastError ? String(globalThis.__maplessLastError?.stack ?? globalThis.__maplessLastError) : null,
    battleRuntimeError: globalThis.__maplessBattleRuntimeError ? String(globalThis.__maplessBattleRuntimeError?.stack ?? globalThis.__maplessBattleRuntimeError) : null,
    generalTrace: globalThis.__maplessGeneralCombatTrace ?? null,
  };
  globalThis.__maplessSelfTestResult = report;
  statusNode.textContent = passed ? `PASS · ${elapsedMs} ms` : `FAIL · ${elapsedMs} ms`;
  statusNode.classList.add(passed ? "pass" : "fail");
  detailNode.textContent = JSON.stringify(report, null, 2);
}

main().catch((error) => {
  const report = {
    passed: false,
    fatal: error?.stack ?? error?.message ?? String(error),
    userAgent: navigator.userAgent,
    results,
  };
  globalThis.__maplessSelfTestResult = report;
  statusNode.textContent = "FAIL · fatal";
  statusNode.classList.add("fail");
  detailNode.textContent = JSON.stringify(report, null, 2);
});
