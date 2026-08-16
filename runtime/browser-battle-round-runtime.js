import { resolveBattleFightMenu } from "./battle-command-selection.js";
import { resolveBattleRuntimeIntegration } from "./battle-runtime-integration.js";
import { pokemonMoveTotalPp } from "./pokemon-runtime.js";

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

function requireMoveMaster(moveMasters, id) {
  const master = moveMasters?.[id];
  if (!master || master.id !== id) throw new TypeError(`move master is required for ${id}`);
  return master;
}

function requireBattleStats(pokemon, label) {
  if (!pokemon?.stats || typeof pokemon.stats !== "object") {
    throw new TypeError(`${label} Pokemon stats are required`);
  }
  for (const id of ["ATTACK", "DEFENSE", "SPECIAL_ATTACK", "SPECIAL_DEFENSE", "SPEED"]) {
    if (!Number.isInteger(pokemon.stats[id]) || pokemon.stats[id] < 0) {
      throw new TypeError(`${label} Pokemon stats.${id} is required`);
    }
  }
}

function requireBattleMoveRuntime(move, label) {
  if (!move || typeof move !== "object" || Array.isArray(move)) {
    throw new TypeError(`${label} move must be materialized before battle`);
  }
  if (!Number.isInteger(move.pp) || move.pp < 0) {
    throw new TypeError(`${label} move pp must be a non-negative integer`);
  }
  return move;
}

function browserCombatSeed() {
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
    const value = new Uint32Array(1);
    globalThis.crypto.getRandomValues(value);
    return value[0] & 0x7fffffff;
  }
  return Math.floor(Math.random() * 0x80000000) & 0x7fffffff;
}

function actionInput({ actor, target, move, moveIndex, battlerIndex, reflectPp }) {
  const special = move.category === "Special";
  const action = {
    kind: "move",
    battlerIndex,
    moveIndex,
    moveId: move.id,
    accuracyInput: {
      baseAccuracy: move.accuracy,
    },
    damageInput: {
      level: actor.level,
      baseDamage: move.power,
      attack: actor.stats[special ? "SPECIAL_ATTACK" : "ATTACK"],
      defense: target.stats[special ? "SPECIAL_DEFENSE" : "DEFENSE"],
      attackStageIndex: 6,
      defenseStageIndex: 6,
      damageMultiplierInput: {
        type: move.type ?? null,
        physicalMove: move.category === "Physical",
        specialMove: special,
      },
    },
    hpBefore: target.hp,
    totalHp: target.max_hp,
  };
  if (reflectPp) {
    const pokemonMove = structuredClone(actor.moves[moveIndex]);
    action.battlePpInput = {
      move: {
        ...pokemonMove,
        totalPp: pokemonMoveTotalPp(move.total_pp, pokemonMove.ppup ?? 0),
      },
      pokemonMoveIndex: moveIndex,
      baseTotalPp: move.total_pp,
    };
  }
  return action;
}

function annotateRuntimeOperation(operation, preparedRound) {
  if (!Number.isInteger(operation?.action)) return operation;
  const actionIndex = Number(operation.action);
  const action = preparedRound.actions[actionIndex];
  const actor = actionIndex === 0 ? "player" : "foe";
  const target = actionIndex === 0 ? "foe" : "player";
  const annotated = { ...operation, actor, target, moveId: action?.moveId ?? null };
  if (operation.op === "faint") annotated.target = target;
  return annotated;
}

function presentationOperations(turnOperations, preparedRound, selection) {
  const operations = [];
  for (const operation of turnOperations) {
    operations.push(annotateRuntimeOperation(operation, preparedRound));
    if (operation.op === "command_phase") {
      operations.push(...selection.operations.map((entry) => ({ ...entry, round: operation.round })));
    }
  }
  return operations;
}

function attachBrowserJudgeStates(input) {
  const prepared = structuredClone(input);
  const round = prepared.rounds[0];
  round.actions[0].judgeState = {
    playerAllFainted: false,
    foeAllFainted: Boolean(round.actions[0].fainted),
  };
  round.actions[1].judgeState = {
    playerAllFainted: Boolean(round.actions[1].fainted),
    foeAllFainted: false,
  };
  return prepared;
}

/**
 * Browser continuation adapter for exactly one interactive Battle round.
 *
 * Core owns command validation, priority, accuracy, damage, HP/faint preparation
 * and decision semantics. This adapter only supplies entropy as separate seeds,
 * commits the resolved action order to two Pokemon Runtime instances and exposes
 * a presentation-friendly stream.
 */
export function resolveBrowserBattleRound({
  player,
  foe,
  selectedMoveId,
  foeMoveId,
  moveMasters,
  combatRandomSeed = browserCombatSeed(),
  priorityRandomSeed = browserCombatSeed(),
} = {}) {
  requireBattleStats(player, "player");
  requireBattleStats(foe, "foe");
  const playerMoveIndex = player.moves.findIndex((move) => moveId(move) === selectedMoveId);
  const foeMoveIndex = foe.moves.findIndex((move) => moveId(move) === foeMoveId);
  if (playerMoveIndex < 0) throw new RangeError("selected move is not known by the player Pokemon");
  if (foeMoveIndex < 0) throw new RangeError("selected move is not known by the foe Pokemon");
  const playerMove = requireMoveMaster(moveMasters, selectedMoveId);
  const foeMove = requireMoveMaster(moveMasters, foeMoveId);
  const playerMoveRuntime = requireBattleMoveRuntime(player.moves[playerMoveIndex], "player");
  requireBattleMoveRuntime(foe.moves[foeMoveIndex], "foe");
  if (playerMoveRuntime.pp <= 0) throw new RangeError("selected move has no PP");

  const selection = resolveBattleFightMenu({
    idxBattler: 0,
    moves: player.moves.map((move) => {
      const id = moveId(move);
      return { id, name: requireMoveMaster(moveMasters, id).name, pp: Number(move.pp) };
    }),
    selections: [playerMoveIndex],
    accepted: { [playerMoveIndex]: true },
  });

  const round = {
    attackPhaseInput: {
      priorityRandomSeed: Number(priorityRandomSeed) & 0x7fffffff,
      battlers: [
        { battlerIndex: 0, choiceKind: "UseMove", fainted: player.hp <= 0, choseRageFunction: false },
        { battlerIndex: 1, choiceKind: "UseMove", fainted: foe.hp <= 0, choseRageFunction: false },
      ],
    },
    commandEntries: [
      {
        battlerIndex: 0, ownedByPlayer: true,
        selectedMoveIndex: playerMoveIndex, selectedMoveId, targetIndex: 1,
      },
      {
        battlerIndex: 1, ownedByPlayer: false,
        selectedMoveIndex: foeMoveIndex, selectedMoveId: foeMoveId, targetIndex: 0,
      },
    ],
    priorityEntries: [
      {
        actionIndex: 0, battlerIndex: 0, speed: player.stats.SPEED,
        movePriority: playerMove.priority,
      },
      {
        actionIndex: 1, battlerIndex: 1, speed: foe.stats.SPEED,
        movePriority: foeMove.priority,
      },
    ],
    actions: [
      actionInput({
        actor: player, target: foe, move: playerMove,
        moveIndex: playerMoveIndex, battlerIndex: 0,
        reflectPp: true,
      }),
      actionInput({
        actor: foe, target: player, move: foeMove,
        moveIndex: foeMoveIndex, battlerIndex: 1,
        reflectPp: true,
      }),
    ],
  };

  const battleInput = {
    useAttackPhaseScheduler: true,
    useCanonicalAccuracyDamage: true,
    combatRandomSeed: Number(combatRandomSeed) & 0x7fffffff,
    rounds: [round],
  };
  const playerRuntime = resolveBattleRuntimeIntegration({
    pokemon: player,
    sendOuts: [[0, player.species], [1, foe.species]],
    battleInput,
    preparedBattleInputTransform: attachBrowserJudgeStates,
    ppActionIndexes: [0],
    reflectedActionIndex: 1,
    reflectedTryUseMoveActionIndex: 0,
    allowIncompleteBattle: true,
  });
  const foeRuntime = resolveBattleRuntimeIntegration({
    pokemon: foe,
    sendOuts: [[0, player.species], [1, foe.species]],
    battleInput,
    preparedBattleInputTransform: attachBrowserJudgeStates,
    ppActionIndexes: [1],
    reflectedActionIndex: 0,
    reflectedTryUseMoveActionIndex: 1,
    allowIncompleteBattle: true,
  });
  const scheduling = playerRuntime.attackPhaseScheduling;
  const combat = playerRuntime.combatTrace;
  const preparedRound = combat.rounds[0];

  const decision = Number(playerRuntime.turn.decision);
  const operations = presentationOperations(playerRuntime.turn.operations, preparedRound, selection);
  const playerPp = playerRuntime.battlePpIntegration ?? { prepared: [], commits: [] };
  const foePp = foeRuntime.battlePpIntegration ?? { prepared: [], commits: [] };

  return {
    player: playerRuntime.pokemon,
    foe: foeRuntime.pokemon,
    decision,
    operations,
    selection,
    scheduling,
    combatRandomSeed: Number(combatRandomSeed) & 0x7fffffff,
    priorityRandomSeed: Number(priorityRandomSeed) & 0x7fffffff,
    ppIntegration: {
      prepared: playerPp.prepared,
      commits: [
        ...playerPp.commits.map((commit) => ({ ...commit, actor: "player" })),
        ...foePp.commits.map((commit) => ({ ...commit, actor: "foe" })),
      ],
    },
    battleRuntimeIntegration: {
      start: playerRuntime.start,
      combatTrace: combat,
      awaitingNextRound: Boolean(playerRuntime.turn.awaitingNextRound),
      playerPpCommits: playerPp.commits.length,
      foePpCommits: foePp.commits.length,
    },
  };
}
