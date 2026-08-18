import { resolveBrowserBattleRound } from "./browser-battle-round-runtime.js";
import { resolveBrowserTrainerBattleRound } from "./browser-trainer-battle-round-runtime.js";
import { resolveBrowserOpponentMoveChoiceCanonical } from "./battle-core-browser-opponent-move-choice.js";
import { SAFARI_MOVE_MASTERS } from "./safari-playable-data.js";
import { finalizeNormalBattle, normalBattleExpInput } from "./safari-normal-battle-finalize.js";

const moveId = (move) => typeof move === "string" ? move : move?.id;

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function battlePresentation(operations) {
  const events = [];
  for (const operation of operations ?? []) {
    if (operation.op === "use_move") {
      events.push({ type: "move_selected", actor: operation.actor, moveId: operation.moveId });
      events.push({ type: "move_started", actor: operation.actor, target: operation.target, moveId: operation.moveId });
    } else if (operation.op === "accuracy_check" && !operation.hit) {
      events.push({ type: "miss", actor: operation.actor, target: operation.target });
    } else if (operation.op === "reduce_hp" || operation.op === "reduce_self_hp") {
      events.push({ type: "damage_applied", actor: operation.actor, target: operation.target, amount: operation.amount, hpBefore: operation.hpBefore, hpAfter: operation.hpAfter });
    } else if (operation.op === "faint" || operation.op === "faint_self") {
      events.push({ type: "faint", target: operation.target });
    } else if (operation.op === "end_of_round" || operation.op === "end_of_round_phase") {
      events.push({ type: "turn_end", turn: operation.battleTurn ?? operation.turn ?? operation.round });
    }
  }
  return events;
}

function reserveCount(party, activeIndex) {
  return Math.max(0, (Array.isArray(party) ? party : []).filter((pokemon, index) => index !== Number(activeIndex) && Number(pokemon?.hp ?? 0) > 0).length);
}

function seedFor(state, battle) {
  const turn = Math.max(1, Math.trunc(Number(battle?.turn ?? 1)));
  const base = battle.kind === "trainer"
    ? Number(battle.trainer_seed ?? 0)
    : (Math.imul(Math.max(1, Math.trunc(Number(state.day ?? 1))), 1_000_003) ^ Math.imul(Number(battle.board_index ?? 0) + 1, 97_409));
  return (base ^ Math.imul(turn, 0x45d9f3b)) & 0x7fffffff;
}

function finish(runtime, battle, resolved, operations) {
  const state = stateOf(runtime);
  battle.last_operations = operations;
  battle.presentation = battlePresentation(operations);
  state.last_operations = operations;
  if (Number(battle.decision) !== 0) finalizeNormalBattle(runtime);
  return {
    ...resolved,
    runtime,
    decision: Number(battle.decision),
    operations: Number(battle.decision) !== 0 ? battle.last_operations : operations,
    presentation: battle.presentation,
    persistenceRequested: false,
  };
}

function resolveTrainer(runtime, selectedMoveId) {
  const state = stateOf(runtime);
  const battle = state.battle;
  const playerIndex = Number(battle.player_party_index ?? 0);
  const player = runtime.player.party[playerIndex];
  if (!player) throw new Error("active player Pokemon is required");
  const defeatedFoe = structuredClone(battle.foe);
  const resolved = resolveBrowserTrainerBattleRound({
    roundInput: {
      player,
      foe: battle.foe,
      playerParty: runtime.player.party,
      foeParty: battle.trainer_party,
      playerActivePartyIndex: playerIndex,
      foeActivePartyIndex: Number(battle.trainer_party_index ?? 0),
      selectedMoveId,
      moveMasters: SAFARI_MOVE_MASTERS,
      playerRandomRoll: 0,
      foeRandomRoll: 0,
      playerBattleExpInput: normalBattleExpInput(player, defeatedFoe, true),
    },
    ownedOpponentInput: {
      battleKind: "trainer",
      foeAiRandomSeed: seedFor(state, battle),
      trainerSkill: Number(battle.skill_level ?? 0),
      trainerFlags: Array.isArray(battle.trainer_flags) ? battle.trainer_flags : [],
      foeReserveCount: reserveCount(battle.trainer_party, battle.trainer_party_index),
      playerReserveCount: reserveCount(runtime.player.party, playerIndex),
      mechanicsGeneration: 9,
      turnCount: Math.max(0, Number(battle.turn ?? 1) - 1),
      canSwitchLax: false,
    },
    partyOrder: Array.isArray(battle.trainer_party_order) ? battle.trainer_party_order : null,
    idxBattler: 1,
    sideSize: 1,
    playerPartyOrder: Array.isArray(battle.player_party_order) ? battle.player_party_order : null,
    playerIdxBattler: 0,
  });
  const next = resolved.nextRoundState;
  if (Array.isArray(next?.playerParty)) runtime.player.party = structuredClone(next.playerParty);
  else runtime.player.party[playerIndex] = structuredClone(resolved.player);
  battle.player_party_index = Number(next?.playerActivePartyIndex ?? playerIndex);
  battle.player_party_order = structuredClone(next?.playerPartyOrder ?? battle.player_party_order ?? null);
  if (Array.isArray(next?.foeParty)) battle.trainer_party = structuredClone(next.foeParty);
  battle.trainer_party_index = Number(next?.foeActivePartyIndex ?? battle.trainer_party_index ?? 0);
  battle.trainer_party_order = structuredClone(next?.partyOrder ?? battle.trainer_party_order ?? null);
  battle.foe = structuredClone(resolved.foe);
  battle.decision = Number(next?.decision ?? resolved.decision ?? 0);
  const roundExpGained = (resolved.expIntegration?.commits ?? []).reduce((sum, commit) => sum + Number(commit.expGained ?? 0), 0);
  if (resolved.foeReplacementApplied) {
    battle.trainer_exp_gained = Number(battle.trainer_exp_gained ?? 0) + roundExpGained;
    battle.exp_gained = 0;
  } else if (battle.decision === 1) {
    battle.exp_gained = roundExpGained;
  }
  const turn = battle.turn;
  battle.turn += 1;
  const operations = (resolved.presentationOperations ?? resolved.operations ?? []).map((operation) => ({ ...operation, battleTurn: turn }));
  const result = finish(runtime, battle, resolved, operations);
  if (resolved.foeReplacementApplied && battle.decision === 0) {
    const trainerName = battle.trainer?.trainer_full_name ?? "トレーナー";
    battle.presentation.push({ type: "trainer_next", actor: "foe", trainer: trainerName, species: battle.foe?.species ?? null, partyIndex: battle.trainer_party_index });
    state.notice = `${trainerName}は${battle.foe?.species ?? "次のポケモン"}を繰り出した！`;
  }
  return result;
}

function resolveWild(runtime, selectedMoveId) {
  const state = stateOf(runtime);
  const battle = state.battle;
  const playerIndex = Number(battle.player_party_index ?? 0);
  const player = runtime.player.party[playerIndex];
  if (!player) throw new Error("active player Pokemon is required");
  const defeatedFoe = structuredClone(battle.foe);
  const choice = resolveBrowserOpponentMoveChoiceCanonical({
    battleKind: "wild",
    player,
    foe: battle.foe,
    moveMasters: SAFARI_MOVE_MASTERS,
    aiRandomSeed: seedFor(state, battle),
    trainerSkill: 0,
    trainerFlags: [],
    ownReserveCount: 0,
    foeReserveCount: reserveCount(runtime.player.party, playerIndex),
    mechanicsGeneration: 9,
    turnCount: Math.max(0, Number(battle.turn ?? 1) - 1),
    canSwitchLax: false,
  });
  const foeMoveId = choice.command === "struggle" ? "STRUGGLE" : choice.moveId;
  const resolved = resolveBrowserBattleRound({
    player,
    foe: battle.foe,
    playerParty: runtime.player.party,
    foeParty: [battle.foe],
    playerActivePartyIndex: playerIndex,
    foeActivePartyIndex: 0,
    reflectedPartyIndex: playerIndex,
    selectedMoveId,
    foeMoveId,
    moveMasters: SAFARI_MOVE_MASTERS,
    playerRandomRoll: 0,
    foeRandomRoll: 0,
    playerBattleExpInput: normalBattleExpInput(player, defeatedFoe, false),
  });
  const handoff = resolved.battleContinuationHandoff;
  if (Array.isArray(handoff?.playerParty)) runtime.player.party = structuredClone(handoff.playerParty);
  else runtime.player.party[playerIndex] = structuredClone(resolved.player);
  battle.player_party_index = Number(handoff?.playerActivePartyIndex ?? playerIndex);
  battle.player_party_order = structuredClone(handoff?.playerPartyOrder ?? battle.player_party_order ?? null);
  battle.foe = structuredClone(resolved.foe);
  battle.decision = Number(resolved.decision);
  const roundExpGained = (resolved.expIntegration?.commits ?? []).reduce((sum, commit) => sum + Number(commit.expGained ?? 0), 0);
  if (battle.decision === 1) battle.exp_gained = roundExpGained;
  const turn = battle.turn;
  battle.turn += 1;
  const operations = (resolved.operations ?? []).map((operation) => ({ ...operation, battleTurn: turn }));
  return finish(runtime, battle, { ...resolved, opponentChoice: choice }, operations);
}

export function resolveSafariNormalBattleRound(runtime, selectedMoveId) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle || battle.completed) throw new Error("active battle is required");
  if (battle.origin === "boundary_trial") throw new Error("boundary battle must use the boundary owner");
  if (battle.kind === "trainer") return resolveTrainer(runtime, selectedMoveId);
  if (battle.kind === "wild") return resolveWild(runtime, selectedMoveId);
  throw new RangeError(`unsupported normal battle kind: ${battle.kind}`);
}
