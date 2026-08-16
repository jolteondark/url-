import { resolveCaptureFlow } from "./battle-capture-flow.js";
import { canRunCanonical, resolveRunCanonical } from "./battle-core-run-flee.js";

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
    return {
      command: "run",
      availability,
      decision: run.decision,
      battleEnded: Number(run.decision) !== 0,
      run,
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
    return {
      command: "capture",
      availability,
      decision: capture.decision,
      battleEnded: Number(capture.decision) !== 0,
      capture,
      operations: capture.operations.map((operation) => ({ ...operation })),
    };
  }

  throw new RangeError("command must be run or capture; fight remains owned by browser-battle-round-runtime");
}
