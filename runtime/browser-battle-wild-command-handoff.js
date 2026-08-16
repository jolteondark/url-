import { resolveCaptureFlow } from "./battle-capture-flow.js";
import { canRunCanonical, resolveRunCanonical } from "./battle-core-run-flee.js";
import { resolveBattleEndPersistenceIntegration } from "./battle-runtime-integration.js";

function requirePokemon(pokemon, label) {
  if (!pokemon || typeof pokemon !== "object" || Array.isArray(pokemon)) {
    throw new TypeError(`${label} Pokemon is required`);
  }
  if (!Number.isInteger(pokemon.hp) || !Number.isInteger(pokemon.max_hp) || pokemon.max_hp <= 0) {
    throw new TypeError(`${label} Pokemon hp/max_hp are required`);
  }
  if (!pokemon.stats || !Number.isInteger(pokemon.stats.SPEED)) {
    throw new TypeError(`${label} Pokemon stats.SPEED is required`);
  }
  return pokemon;
}

function resolveTerminalState({ decision, resultKind, player, postBattlePersistenceInput, reflectedPartyIndex }) {
  const terminal = Number(decision) !== 0;
  const persistence = terminal
    ? resolveBattleEndPersistenceIntegration({
        decision,
        persistenceInput: postBattlePersistenceInput,
        reflectedPokemon: player,
        reflectedPartyIndex,
        reflectMoves: Array.isArray(player.moves),
        reflectExpLevel: Number.isInteger(player.exp) && Number.isInteger(player.level),
        reflectStatus: Object.prototype.hasOwnProperty.call(player, "status"),
        reflectItem: Object.prototype.hasOwnProperty.call(player, "item"),
      })
    : null;
  const sourceParty = persistence?.party ?? postBattlePersistenceInput?.party ?? [];
  return {
    terminal,
    decision: Number(decision),
    resultKind,
    player: structuredClone(player),
    playerParty: structuredClone(sourceParty),
    postBattlePersistenceApplied: persistence !== null,
    ...(persistence ? { postBattlePersistence: persistence } : {}),
  };
}

export function projectBrowserWildBattleAvailability({ player, foe, trainerBattle = false, runInput = {} } = {}) {
  const user = requirePokemon(player, "player");
  const target = requirePokemon(foe, "foe");
  const targetFainted = target.hp <= 0;
  const normalizedRun = {
    ...runInput,
    trainerBattle: Boolean(trainerBattle),
    battlerOpposes: false,
    speedPlayer: user.stats.SPEED,
    opponentSpeeds: [target.stats.SPEED],
  };
  return {
    canFight: user.hp > 0 && !targetFainted,
    canRun: !targetFainted && canRunCanonical(normalizedRun),
    canCapture: !targetFainted && !trainerBattle,
  };
}

export function resolveBrowserWildBattleCommand({
  command,
  player,
  foe,
  trainerBattle = false,
  decision = 0,
  runInput = {},
  captureInput = {},
  postBattlePersistenceInput = null,
  reflectedPartyIndex = 0,
} = {}) {
  const user = requirePokemon(player, "player");
  const target = requirePokemon(foe, "foe");
  const availability = projectBrowserWildBattleAvailability({ player: user, foe: target, trainerBattle, runInput });

  if (command === "run") {
    const run = resolveRunCanonical({
      ...runInput,
      trainerBattle: Boolean(trainerBattle),
      battlerOpposes: false,
      decision,
      speedPlayer: user.stats.SPEED,
      opponentSpeeds: [target.stats.SPEED],
    });
    const terminalStateHandoff = resolveTerminalState({
      decision: run.decision,
      resultKind: Number(run.decision) === 3 ? "fled" : "run_failed",
      player: user,
      postBattlePersistenceInput,
      reflectedPartyIndex,
    });
    return {
      command: "run",
      availability,
      decision: run.decision,
      battleEnded: terminalStateHandoff.terminal,
      run,
      terminalStateHandoff,
      ...(terminalStateHandoff.postBattlePersistence ? { postBattlePersistence: terminalStateHandoff.postBattlePersistence } : {}),
      operations: [{ op: "run_attempt", result: run.result, reason: run.reason, rate: run.rate, randomRoll: run.randomRoll }],
    };
  }

  if (command === "capture") {
    const ball = captureInput.ball ?? captureInput.capture?.ball;
    if (typeof ball !== "string" || ball.length === 0) throw new TypeError("captureInput.ball is required");
    const capture = resolveCaptureFlow({
      ...captureInput,
      ball,
      decision,
      trainerBattle: Boolean(trainerBattle),
      targetFainted: target.hp <= 0,
      capture: {
        ...(captureInput.capture ?? {}),
        ball,
        hp: target.hp,
        totalHp: target.max_hp,
        status: target.status ?? captureInput.capture?.status ?? "NONE",
      },
    });
    const terminalStateHandoff = resolveTerminalState({
      decision: capture.decision,
      resultKind: capture.result === "caught" && Number(capture.decision) !== 0 ? "captured" : "capture_failed",
      player: user,
      postBattlePersistenceInput,
      reflectedPartyIndex,
    });
    return {
      command: "capture",
      availability,
      decision: capture.decision,
      battleEnded: terminalStateHandoff.terminal,
      capture,
      terminalStateHandoff,
      ...(terminalStateHandoff.postBattlePersistence ? { postBattlePersistence: terminalStateHandoff.postBattlePersistence } : {}),
      operations: capture.operations.map((operation) => ({ ...operation })),
    };
  }

  throw new RangeError("command must be run or capture; fight remains owned by browser-battle-round-runtime");
}
