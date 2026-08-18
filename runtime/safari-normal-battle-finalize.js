import { resolveExpLevelMoveFlow } from "./battle-exp-level-move-flow.js";
import { resolveItemReceipt } from "./bag-economy-item-receipt.js";
import { setMoney } from "./bag-economy-mart-flow.js";
import { maplessCarryMoneyGain } from "./mapless-carry-class-rules.js";
import { resolveDayBoardPlayableTurn } from "./mapless-day-board-playable-turn.js";
import { markMaplessRunEnd } from "./mapless-run-end-lifecycle.js";
import { resolvePokemonRuntimeMasters } from "./pokemon-runtime-masters.js";
import { SAFARI_MOVE_MASTERS, SAFARI_NATURE_MASTERS, SAFARI_SPECIES_MASTERS } from "./safari-playable-data.js";

const moveId = (move) => typeof move === "string" ? move : move?.id;
const normalizeMoveId = (id) => id === "QUICK_ATTACK" ? "QUICKATTACK" : id;

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function baseTurnInput(state, index) {
  return {
    index,
    day: state.day,
    board_events: state.board_events,
    board_revealed: state.board_revealed,
    board_consumed: state.board_consumed,
    board_visited: state.board_visited,
    notice: state.notice,
    scene_is_self: true,
    scene_same: true,
    event_stage_active: true,
    pending_hatches: [],
  };
}

function materializePokemon(input) {
  const speciesMaster = SAFARI_SPECIES_MASTERS[input?.species];
  if (!speciesMaster) throw new RangeError(`species is outside the Safari projection: ${input?.species}`);
  const natureId = input.nature_for_stats_id ?? input.nature_id ?? "HARDY";
  const natureMaster = SAFARI_NATURE_MASTERS[natureId];
  if (!natureMaster) throw new RangeError(`nature is outside the Safari projection: ${natureId}`);
  const moves = (input.moves ?? []).map((move) => {
    const id = normalizeMoveId(moveId(move));
    return typeof move === "string" ? id : { ...move, id };
  });
  return resolvePokemonRuntimeMasters({ ...input, nature_id: input.nature_id ?? natureId, moves }, {
    species_master: speciesMaster,
    nature_master: natureMaster,
    move_masters: SAFARI_MOVE_MASTERS,
  });
}

export function normalBattleExpInput(player, defeatedFoe, trainerBattle = false) {
  const foeMaster = SAFARI_SPECIES_MASTERS[defeatedFoe?.species];
  const speciesMaster = SAFARI_SPECIES_MASTERS[player?.species];
  if (!foeMaster || !speciesMaster) throw new RangeError("battle EXP species is outside the Safari projection");
  const natureId = player.nature_for_stats_id ?? player.nature_id ?? "HARDY";
  const natureMaster = SAFARI_NATURE_MASTERS[natureId];
  if (!natureMaster) throw new RangeError(`battle EXP nature is outside the Safari projection: ${natureId}`);
  return {
    maximumExp: 1_000_000,
    maxMoves: 4,
    expContext: {
      defeatedLevel: defeatedFoe.level,
      baseExp: foeMaster.base_exp,
      numParticipants: 1,
      expShareCount: 0,
      participant: true,
      hasExpShare: false,
      expAll: false,
      splitExpBetweenGainers: true,
      moreExpFromTrainerPokemon: trainerBattle,
      trainerBattle,
      scaledExpFormula: false,
      outsiderMultiplier: 1,
    },
    levelThresholds: { 6: 216, 7: 343, 8: 512, 9: 729, 10: 1000 },
    movesByLevel: { 10: ["QUICKATTACK"] },
    moveDecisions: {},
    runtimeMasters: {
      species_master: speciesMaster,
      nature_master: natureMaster,
      move_masters: SAFARI_MOVE_MASTERS,
    },
  };
}

function givePotion(runtime, battle) {
  const receipt = resolveItemReceipt({
    slots: runtime.bag.slots,
    maxSlots: 20,
    maxPerSlot: 99,
    item: "POTION",
    quantity: 1,
    itemValid: true,
    kind: "prize",
    pocket: "MEDICINE",
  });
  runtime.bag.slots = receipt.slots;
  battle.reward = receipt.success ? { item: "POTION", quantity: 1 } : null;
  return receipt.operations.map((operation) => ({ ...operation, scope: "reward" }));
}

function awardWildWin(runtime, battle) {
  const playerIndex = Number(battle.player_party_index ?? 0);
  const player = runtime.player.party[playerIndex];
  if (!player) throw new Error("active player Pokemon is required for wild EXP");
  const foeMaster = SAFARI_SPECIES_MASTERS[battle.foe.species];
  if (!foeMaster) return givePotion(runtime, battle);
  const expFlow = resolveExpLevelMoveFlow({
    pokemon: { exp: player.exp ?? 0, level: player.level, moves: player.moves.map(moveId) },
    maximumExp: 1_000_000,
    maxMoves: 4,
    expContext: {
      defeatedLevel: battle.foe.level,
      baseExp: foeMaster.base_exp,
      numParticipants: 1,
      expShareCount: 0,
      participant: true,
      hasExpShare: false,
      expAll: false,
      splitExpBetweenGainers: true,
      moreExpFromTrainerPokemon: false,
      trainerBattle: false,
      scaledExpFormula: false,
      outsiderMultiplier: 1,
    },
    levelThresholds: { 6: 216, 7: 343, 8: 512, 9: 729, 10: 1000 },
    movesByLevel: { 10: ["QUICKATTACK"] },
    moveDecisions: {},
  });
  const currentMoves = new Map(player.moves.map((move) => [moveId(move), move]));
  runtime.player.party[playerIndex] = materializePokemon({
    ...player,
    exp: expFlow.pokemon.exp,
    level: expFlow.pokemon.level,
    moves: expFlow.pokemon.moves.map((id) => currentMoves.get(normalizeMoveId(id)) ?? normalizeMoveId(id)),
  });
  battle.exp_gained = expFlow.expGained;
  return [
    ...expFlow.operations.map((operation) => ({ ...operation, scope: "exp" })),
    ...givePotion(runtime, battle),
  ];
}

function completeBoardEvent(state, battle) {
  const event = state.board_events?.[battle.board_index];
  const input = baseTurnInput(state, battle.board_index);
  if (battle.kind === "wild") {
    const encounter = battle.encounter ?? {};
    input.wild = {
      can_battle: true,
      encounter: { species_id: encounter.species_id ?? battle.foe.species, level: encounter.level ?? battle.foe.level },
      species_exists: true,
      species_name: encounter.species_name ?? battle.foe.species,
      outcome: battle.decision,
      run_end_pending: Boolean(state.mapless_run_end_pending),
      old_consumed: false,
      game_temp_present: true,
    };
  } else {
    input.trainer = {
      can_battle: true,
      dynamic_result: {
        outcome: battle.decision,
        trainer_full_name: event?.trainer_full_name ?? battle.trainer?.trainer_full_name ?? "トレーナー",
      },
      last_error: null,
    };
  }
  const turn = resolveDayBoardPlayableTurn(input);
  state.board_events = turn.state.board_events;
  state.board_revealed = turn.state.board_revealed;
  state.board_consumed = turn.state.board_consumed;
  return [...turn.operations];
}

function payTrainerPrize(runtime, battle) {
  if (battle.kind !== "trainer" || battle.decision !== 1 || battle.trainer_prize_paid) return [];
  const requested = Math.max(0, Math.trunc(Number(battle.prize_money ?? 0)));
  const carryClass = stateOf(runtime).mapless_carry_class ?? "general";
  const adjusted = maplessCarryMoneyGain(requested, carryClass);
  const before = Number(runtime.bag.money ?? 0);
  runtime.bag.money = setMoney(before + adjusted, 999999);
  const gained = runtime.bag.money - before;
  battle.trainer_prize_paid = true;
  battle.money_gained = gained;
  return [{ op: "trainer_prize_money", requested, adjusted, applied: gained, carryClass, trainer: battle.trainer?.trainer_full_name ?? null }];
}

export function finalizeNormalBattle(runtime) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle || battle.completed || Number(battle.decision) === 0) return [];

  const runEnd = markMaplessRunEnd(runtime, battle.decision);
  const operations = [...runEnd.operations, ...completeBoardEvent(state, battle)];
  if (battle.decision === 1 && battle.kind === "wild") operations.push(...awardWildWin(runtime, battle));
  if (battle.decision === 1 && battle.kind === "trainer") operations.push(...givePotion(runtime, battle));
  if (battle.kind === "trainer") operations.push(...payTrainerPrize(runtime, battle));
  battle.completed = true;
  battle.return_target = runEnd.marked ? "home" : "day_board";
  battle.last_operations = [...(battle.last_operations ?? []), ...operations];
  battle.presentation = [
    ...(battle.presentation ?? []),
    {
      type: "battle_result",
      decision: battle.decision,
      captured: false,
      expGained: Number(battle.trainer_exp_gained ?? 0) + Number(battle.exp_gained ?? 0),
      reward: battle.reward ?? null,
      moneyGained: Number(battle.money_gained ?? 0),
      returnTarget: battle.return_target,
    },
  ];
  state.last_operations = operations;
  const label = battle.kind === "trainer"
    ? (battle.trainer?.trainer_full_name ?? state.board_events?.[battle.board_index]?.trainer_full_name ?? "トレーナー")
    : (battle.encounter?.species_name ?? battle.foe.species);
  state.notice = runEnd.marked
    ? "手持ちが全滅しました。ラン終了処理へ進みます。"
    : battle.decision === 1 ? `${label}に勝利しました。` : "戦闘に敗北しました。";
  return operations;
}
