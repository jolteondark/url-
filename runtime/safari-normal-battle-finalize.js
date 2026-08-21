import { resolveSafariBattleExpGrowthInput } from "./safari-battle-exp-growth-owner.js";
import { resolveItemReceipt } from "./bag-economy-item-receipt.js";
import { setMoney } from "./bag-economy-mart-flow.js";
import { maplessCarryMoneyGain } from "./mapless-carry-class-rules.js";
import { resolveDayBoardPlayableTurn } from "./mapless-day-board-playable-turn.js";
import { markMaplessRunEnd } from "./mapless-run-end-lifecycle.js";
import { resolvePokemonLevelEvolutionWithLocationContext } from "./pokemon-level-evolution-location-context.js";
import { resolvePokemonRuntimeMasters } from "./pokemon-runtime-masters.js";
import { SAFARI_MOVE_MASTERS, SAFARI_NATURE_MASTERS, SAFARI_SPECIES_MASTERS } from "./safari-playable-data.js";

const moveId = (move) => typeof move === "string" ? move : move?.id;
const normalizeMoveId = (id) => id === "QUICK_ATTACK" ? "QUICKATTACK" : id;

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function requestsSave(operations = []) {
  return operations.some((operation) => operation?.op === "request_save");
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
    evolutionMasters: {
      species_masters: SAFARI_SPECIES_MASTERS,
      nature_master: natureMaster,
      move_masters: SAFARI_MOVE_MASTERS,
    },
    // Essentials applies level-up EXP/move learning during battle resolution, then
    // checks evolution after the battle. The central REWARD_GROWTH hook owns that tail.
    deferEvolution: true,
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
  state.board_visited = turn.state.board_visited;
  const operations = [...turn.operations];
  const index = Number(battle.board_index);
  if (Number.isInteger(index) && index >= 0 && index < state.board_visited.length) {
    state.board_visited[index] = true;
    operations.push({ op: "set_board_visited", index, value: true });
  }
  return operations;
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

function evolutionContextOf(battle = {}) {
  const context = battle?.evolution_context ?? battle?.evolutionContext ?? {};
  return {
    time_hour: context?.hour ?? context?.hour_of_day ?? context?.hourOfDay,
    weather_type: context?.weather ?? context?.weather_type ?? context?.weatherType,
    cycling: context?.cycling ?? context?.bicycle ?? context?.on_bicycle,
    surfing: context?.surfing ?? context?.is_surfing,
    diving: context?.diving ?? context?.is_diving,
    dark_map: context?.dark_map ?? context?.darkness ?? context?.is_dark_map,
    map_id: context?.map_id ?? context?.mapId ?? context?.location_id ?? context?.locationId,
    map_flags: context?.map_flags ?? context?.mapFlags ?? context?.location_flags ?? context?.locationFlags,
    region_id: context?.region_id ?? context?.regionId,
  };
}

function commitPendingLevelEvolutions(runtime, battle = {}) {
  const party = Array.isArray(runtime?.player?.party) ? runtime.player.party : [];
  const operations = [];
  const presentation = [];
  const unsupportedMethods = new Set();
  const evolutionContext = evolutionContextOf(battle);

  for (let index = 0; index < party.length; index += 1) {
    const pokemon = party[index];
    if (!pokemon || pokemon.__battle_level_evolution_pending !== true) continue;

    const candidate = { ...pokemon };
    delete candidate.__battle_level_evolution_pending;
    const natureId = candidate.nature_for_stats_id ?? candidate.nature_id ?? "HARDY";
    const natureMaster = SAFARI_NATURE_MASTERS[natureId];
    if (!natureMaster) throw new RangeError(`battle evolution nature is outside the Safari projection: ${natureId}`);

    const resolved = resolvePokemonLevelEvolutionWithLocationContext(candidate, {
      species_masters: SAFARI_SPECIES_MASTERS,
      nature_master: natureMaster,
      move_masters: SAFARI_MOVE_MASTERS,
      party,
      ...evolutionContext,
    });
    party[index] = resolved.pokemon;
    operations.push(...structuredClone(resolved.operations ?? []));
    for (const method of resolved.unsupportedMethods ?? []) unsupportedMethods.add(method);
    if (resolved.evolved && resolved.evolution) {
      presentation.push({
        type: "evolution",
        actor: "player",
        from: resolved.evolution.from,
        to: resolved.evolution.to,
      });
    }
  }

  if (unsupportedMethods.size > 0) operations.push({ op: "unsupported_evolution_methods", methods: [...unsupportedMethods] });
  return { operations, presentation, unsupportedMethods: [...unsupportedMethods] };
}

export function commitSafariNormalLevelEvolutionRewardGrowth(runtime, result = {}) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle || Number(battle.decision) === 0) return result;

  const pending = commitPendingLevelEvolutions(runtime, battle);
  if (pending.operations.length === 0 && pending.presentation.length === 0 && pending.unsupportedMethods.length === 0) return result;

  battle.unsupported_evolution_methods = [...pending.unsupportedMethods];
  battle.last_operations = [...pending.operations, ...(battle.last_operations ?? result.operations ?? [])];
  battle.presentation = [...pending.presentation, ...(battle.presentation ?? result.presentation ?? [])];
  state.last_operations = [...battle.last_operations];
  result.operations = [...battle.last_operations];
  result.presentation = [...battle.presentation];
  result.persistenceRequested = requestsSave(result.operations);
  return result;
}

function terminalRewardPresentation(battle) {
  if (Number(battle.decision) !== 1) return [];
  const events = [];
  if (battle.reward?.item) events.push({ type: "item_reward", item: battle.reward.item, quantity: Number(battle.reward.quantity ?? 1) });
  const moneyGained = Number(battle.money_gained ?? 0);
  if (moneyGained > 0) events.push({ type: "money_reward", amount: moneyGained });
  return events;
}

export function finalizeNormalBattle(runtime) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle || battle.completed || Number(battle.decision) === 0) return [];
  // The mechanics round can discover a terminal decision before the central state machine
  // reaches REWARD_GROWTH. Rewards, Board consume, run-end marking and save requests must
  // not mutate runtime state until that explicit checkpoint.
  if (battle.phase !== "REWARD_GROWTH") return [];
  if (battle.normal_terminal_reward_growth_committed === true) return [];

  const runEnd = markMaplessRunEnd(runtime, battle.decision);
  const operations = [...runEnd.operations];
  if (battle.decision === 1 && battle.kind === "wild") operations.push(...givePotion(runtime, battle));
  if (battle.decision === 1 && battle.kind === "trainer") operations.push(...givePotion(runtime, battle));
  if (battle.kind === "trainer") operations.push(...payTrainerPrize(runtime, battle));
  operations.push(...completeBoardEvent(state, battle));
  operations.push({ op: "request_save", reason: "battle_result" });
  // RESULT is the sole completion boundary. This owner commits the existing reward/Board
  // mechanics at REWARD_GROWTH; completion itself remains owned by the orchestrator.
  battle.return_target = runEnd.marked ? "home" : "day_board";
  battle.last_operations = [...(battle.last_operations ?? []), ...operations];
  battle.presentation = [
    ...(battle.presentation ?? []),
    ...terminalRewardPresentation(battle),
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
  battle.normal_terminal_reward_growth_committed = true;
  state.last_operations = operations;
  const label = battle.kind === "trainer"
    ? (battle.trainer?.trainer_full_name ?? state.board_events?.[battle.board_index]?.trainer_full_name ?? "トレーナー")
    : (battle.encounter?.species_name ?? battle.foe.species);
  state.notice = runEnd.marked
    ? "手持ちが全滅しました。ラン終了処理へ進みます。"
    : battle.decision === 1 ? `${label}に勝利しました。` : "戦闘に敗北しました。";
  return operations;
}

export function commitSafariNormalTerminalRewardGrowth(runtime, result = {}) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle || Number(battle.decision) === 0) return result;
  finalizeNormalBattle(runtime);
  result.operations = [...(battle.last_operations ?? result.operations ?? [])];
  result.presentation = [...(battle.presentation ?? result.presentation ?? [])];
  result.persistenceRequested = requestsSave(result.operations);
  return commitSafariNormalLevelEvolutionRewardGrowth(runtime, result);
}
