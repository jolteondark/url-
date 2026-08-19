import { resolveSafariBattleExpGrowthInput } from "./safari-battle-exp-growth-owner.js";
import { resolveItemReceipt } from "./bag-economy-item-receipt.js";
import { setMoney } from "./bag-economy-mart-flow.js";
import { maplessCarryMoneyGain } from "./mapless-carry-class-rules.js";
import { resolveDayBoardPlayableTurn } from "./mapless-day-board-playable-turn.js";
import { markMaplessRunEnd } from "./mapless-run-end-lifecycle.js";
import { resolvePokemonRuntimeMasters } from "./pokemon-runtime-masters.js";
import { SAFARI_MOVE_MASTERS, SAFARI_NATURE_MASTERS, SAFARI_SPECIES_MASTERS } from "./safari-playable-data.js";

const moveId = (move) => typeof move === "string" ? move : move?.id;
const normalizeMoveId = (id) => id === "QUICK_ATTACK" ? "QUICKATTACK" : id;
const COMMAND_PHASE = "command";
const TERMINAL_PHASES = new Set(["post_victory", "post_loss"]);

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

export function setNormalBattleLifecyclePhase(battle, phase) {
  if (!battle || typeof battle !== "object") throw new TypeError("battle state is required");
  battle.lifecycle_phase = String(phase);
  return battle.lifecycle_phase;
}

export function normalBattleAcceptsCommand(battle) {
  if (!battle || battle.completed || Number(battle.decision ?? 0) !== 0) return false;
  if (battle.player_replacement_required) return false;
  const phase = battle.lifecycle_phase == null ? COMMAND_PHASE : String(battle.lifecycle_phase);
  return phase === COMMAND_PHASE;
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
    ...resolveSafariBattleExpGrowthInput(player, defeatedFoe, speciesMaster, foeMaster, trainerBattle),
    runtimeMasters: {
      species_master: speciesMaster,
      nature_master: natureMaster,
      move_masters: SAFARI_MOVE_MASTERS,
    },
  };
}

function givePotion(runtime, battle) {
  if (battle.victory_reward_applied) return [];
  battle.victory_reward_applied = true;
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

function completeBoardEvent(state, battle) {
  if (battle.board_completion_applied) return [];
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
  state.board_visited = turn.state.board_visited;
  battle.board_completion_applied = true;
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

function evolutionCheckpoint(runtime, battle) {
  if (battle.decision !== 1 || battle.evolution_tail_checked) return [];
  const partyIndex = Number(battle.player_party_index ?? 0);
  const pokemon = runtime.player?.party?.[partyIndex] ?? null;
  battle.evolution_tail_checked = true;
  return [{
    op: "battle_evolution_checkpoint",
    partyIndex,
    species: pokemon?.species ?? null,
    ready: Boolean(pokemon?.ready_to_evolve),
  }];
}

function requestTerminalSave(battle) {
  if (battle.terminal_save_requested) return [];
  battle.terminal_save_requested = true;
  return [{ op: "request_save", reason: "normal_battle_terminal" }];
}

function terminalResultEvent(battle, returnTarget) {
  return {
    type: "battle_result",
    decision: battle.decision,
    captured: false,
    expGained: Number(battle.trainer_exp_gained ?? 0) + Number(battle.exp_gained ?? 0),
    reward: battle.reward ?? null,
    moneyGained: Number(battle.money_gained ?? 0),
    returnTarget,
  };
}

export function finalizeNormalBattle(runtime) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle || Number(battle.decision) === 0 || battle.terminal_finalize_applied) return [];
  if (battle.completed) return [];

  const terminalPhase = Number(battle.decision) === 1 ? "post_victory" : "post_loss";
  setNormalBattleLifecyclePhase(battle, terminalPhase);
  battle.terminal_locked = true;
  const operations = [{ op: "battle_lifecycle_phase", phase: terminalPhase }];

  // EXP/level/move operations are committed by the round owner before this
  // terminal tail. Do not recalculate them here. The checkpoint keeps evolution
  // after that owner-owned tail and before rewards without inventing evolution data.
  operations.push(...evolutionCheckpoint(runtime, battle));

  if (battle.decision === 1) {
    operations.push(...givePotion(runtime, battle));
    if (battle.kind === "trainer") operations.push(...payTrainerPrize(runtime, battle));
  }

  const runEnd = markMaplessRunEnd(runtime, battle.decision);
  operations.push(...runEnd.operations);
  operations.push(...completeBoardEvent(state, battle));
  operations.push(...requestTerminalSave(battle));

  const returnTarget = runEnd.marked ? "home" : "day_board";
  if (!battle.result_presentation_applied) {
    battle.presentation = [...(battle.presentation ?? []), terminalResultEvent(battle, returnTarget)];
    battle.result_presentation_applied = true;
  }
  battle.return_target = returnTarget;
  battle.completed = true;
  battle.terminal_finalize_applied = true;
  battle.terminal_locked = false;
  setNormalBattleLifecyclePhase(battle, "completed");
  operations.push({ op: "battle_lifecycle_phase", phase: "completed" });
  battle.last_operations = [...(battle.last_operations ?? []), ...operations];
  state.last_operations = operations;

  const label = battle.kind === "trainer"
    ? (battle.trainer?.trainer_full_name ?? state.board_events?.[battle.board_index]?.trainer_full_name ?? "トレーナー")
    : (battle.encounter?.species_name ?? battle.foe.species);
  state.notice = runEnd.marked
    ? "手持ちが全滅しました。ラン終了処理へ進みます。"
    : battle.decision === 1 ? `${label}に勝利しました。` : "戦闘に敗北しました。";
  return operations;
}
