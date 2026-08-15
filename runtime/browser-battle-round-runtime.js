import { resolveBattleFightMenu } from "./battle-command-selection.js";
import { prepareCombatTurnInputCanonical } from "./battle-core-combat-turn.js";
import { resolveAttackPhaseMovesCanonical } from "./battle-core-attack-phase-moves.js";
import { judgeCanonical } from "./battle-core-turn-vertical-slice.js";
import {
  commitBattleSystemsPpRuntime,
  prepareBattleSystemsPpRuntime,
} from "./battle-move-pp-integration.js";
import { pokemonMoveTotalPp, updatePokemonRuntime } from "./pokemon-runtime.js";

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

function actionInput({ actor, target, move, moveIndex, battlerIndex, randomRoll, reflectPp }) {
  const special = move.category === "Special";
  const action = {
    kind: "move",
    battlerIndex,
    moveIndex,
    moveId: move.id,
    accuracyInput: {
      baseAccuracy: move.accuracy,
      randomRoll,
    },
    damageInput: {
      level: actor.level,
      baseDamage: move.power,
      attack: actor.stats[special ? "SPECIAL_ATTACK" : "ATTACK"],
      defense: target.stats[special ? "SPECIAL_DEFENSE" : "DEFENSE"],
      attackStageIndex: 6,
      defenseStageIndex: 6,
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

function operationForHp(actionIndex, action) {
  const hp = action.hpReductionResolution;
  return {
    op: "reduce_hp",
    round: 1,
    action: actionIndex,
    amount: Number(hp.amount),
    hpBefore: Number(action.hpBefore),
    hpAfter: Number(action.hpAfter),
    droppedBelowHalfHP: Boolean(hp.droppedBelowHalfHP),
    tookDamageThisRound: Boolean(hp.tookDamageThisRound),
    tookMoveDamageThisRound: Boolean(hp.tookMoveDamageThisRound),
  };
}

/**
 * Browser continuation adapter for exactly one interactive Battle round.
 *
 * Core owns command validation, priority, accuracy, damage, HP/faint preparation
 * and decision semantics. This adapter only commits the resolved action order
 * to two Pokemon Runtime instances and exposes a presentation-friendly stream.
 */
export function resolveBrowserBattleRound({
  player,
  foe,
  selectedMoveId,
  foeMoveId,
  moveMasters,
  playerRandomRoll = 0,
  foeRandomRoll = 0,
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
        actionIndex: 0, speed: player.stats.SPEED,
        movePriority: playerMove.priority, tieBreaker: 1,
      },
      {
        actionIndex: 1, speed: foe.stats.SPEED,
        movePriority: foeMove.priority, tieBreaker: 0,
      },
    ],
    actions: [
      actionInput({
        actor: player, target: foe, move: playerMove,
        moveIndex: playerMoveIndex, battlerIndex: 0,
        randomRoll: playerRandomRoll, reflectPp: true,
      }),
      actionInput({
        actor: foe, target: player, move: foeMove,
        moveIndex: foeMoveIndex, battlerIndex: 1,
        randomRoll: foeRandomRoll, reflectPp: true,
      }),
    ],
  };

  const ppPrepared = prepareBattleSystemsPpRuntime({ battleInput: { rounds: [round] } });
  const ppPreparedRound = ppPrepared.battleInput.rounds[0];
  const scheduling = resolveAttackPhaseMovesCanonical({
    commandEntries: ppPreparedRound.commandEntries,
    actions: ppPreparedRound.actions,
    priorityEntries: ppPreparedRound.priorityEntries,
    mechanicsGeneration: 9,
  });
  const combat = prepareCombatTurnInputCanonical(ppPrepared.battleInput);
  const preparedRound = combat.rounds[0];
  preparedRound.actions[0].judgeState = {
    playerAllFainted: false,
    foeAllFainted: Boolean(preparedRound.actions[0].fainted),
  };
  preparedRound.actions[1].judgeState = {
    playerAllFainted: Boolean(preparedRound.actions[1].fainted),
    foeAllFainted: false,
  };

  let playerAfter = updatePokemonRuntime(player, {});
  let foeAfter = updatePokemonRuntime(foe, {});
  let decision = 0;
  const operations = [
    { op: "round_header", round: 1 },
    { op: "command_phase", round: 1 },
    ...selection.operations.map((operation) => ({ ...operation, round: 1 })),
    { op: "attack_phase", round: 1 },
    ...scheduling.operations.map((operation) => ({ ...operation, round: 1 })),
  ];

  for (const actionIndex of scheduling.processOrder) {
    const action = preparedRound.actions[actionIndex];
    const actor = actionIndex === 0 ? "player" : "foe";
    const target = actionIndex === 0 ? "foe" : "player";
    operations.push({
      op: "use_move", round: 1, action: actionIndex,
      actor, target, moveId: action.moveId,
    });
    if (action.moveSkipped) continue;
    operations.push({
      op: "accuracy_check", round: 1, action: actionIndex,
      actor, target, moveId: action.moveId, hit: Boolean(action.accuracyHit),
    });
    if (action.accuracyHit) {
      operations.push({
        op: "calc_damage", round: 1, action: actionIndex,
        actor, target, moveId: action.moveId,
        damage: Number(action.calculatedDamage),
      });
      if (action.hpReductionResolution) {
        operations.push({
          ...operationForHp(actionIndex, action),
          actor, target, moveId: action.moveId,
        });
        if (target === "player") playerAfter = updatePokemonRuntime(playerAfter, { hp: action.hpAfter });
        else foeAfter = updatePokemonRuntime(foeAfter, { hp: action.hpAfter });
      }
      if (action.fainted) operations.push({ op: "faint", round: 1, action: actionIndex, target });
    }
    decision = judgeCanonical(action.judgeState);
    operations.push({ op: "judge", round: 1, action: actionIndex, actor, decision });
    if (decision > 0) break;
  }

  if (decision === 0) {
    operations.push({ op: "end_of_round_phase", round: 1 });
    operations.push({ op: "judge", round: 1, scope: "end_of_round", decision: 0 });
  } else {
    operations.push({ op: "end_of_battle", decision });
  }

  const playerPpCommitted = commitBattleSystemsPpRuntime({
    battleInput: combat,
    turn: {
      decision,
      operations: operations.filter((operation) => operation.op !== "use_move" || operation.action === 0),
    },
    pokemon: playerAfter,
  });
  const foePpCommitted = commitBattleSystemsPpRuntime({
    battleInput: combat,
    turn: {
      decision,
      operations: operations.filter((operation) => operation.op !== "use_move" || operation.action === 1),
    },
    pokemon: foeAfter,
  });
  playerAfter = playerPpCommitted.pokemon;
  foeAfter = foePpCommitted.pokemon;

  return {
    player: playerAfter,
    foe: foeAfter,
    decision,
    operations,
    selection,
    scheduling,
    ppIntegration: {
      prepared: ppPrepared.operations,
      commits: [
        ...playerPpCommitted.commits.map((commit) => ({ ...commit, actor: "player" })),
        ...foePpCommitted.commits.map((commit) => ({ ...commit, actor: "foe" })),
      ],
    },
  };
}
