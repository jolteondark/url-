import { cloneGameState } from './game-state.js';
import { resolveMaplessNormalBattleVictoryReward } from './battle/mapless-normal-battle-reward.js';
import { generateCanonicalDayBoard } from './board/canonical-day-board.js';

function result(state, events = [], effects = []) { return { state, events, effects }; }
function exactNonnegativeInteger(value, boundary) {
  const number = Number(value ?? 0);
  if (!Number.isInteger(number) || number < 0) throw new Error(`${boundary} requires a non-negative integer`);
  return number;
}
function stableMemberId(member) {
  const raw = member?.id ?? member?.personalId;
  if (raw === undefined || raw === null || String(raw) === '') throw new Error('reward EXP requires stable party member ids');
  return String(raw);
}
function diagnosticsArray(state, key) {
  state.diagnostics ??= {};
  state.diagnostics[key] ??= [];
  if (!Array.isArray(state.diagnostics[key])) throw new Error(`New Core diagnostics.${key} must be an array`);
  return state.diagnostics[key];
}
function applyPartyExp(party, gains) {
  const gainById = new Map();
  for (const entry of gains) {
    const memberId = String(entry?.memberId ?? '');
    if (!memberId) throw new Error('party EXP entry requires memberId');
    if (gainById.has(memberId)) throw new Error(`duplicate party EXP memberId: ${memberId}`);
    gainById.set(memberId, exactNonnegativeInteger(entry.exp, `party EXP for ${memberId}`));
  }
  const knownIds = new Set(party.map(stableMemberId));
  for (const memberId of gainById.keys()) if (!knownIds.has(memberId)) throw new Error(`party EXP targets unknown member: ${memberId}`);
  return party.map((member) => {
    const memberId = stableMemberId(member);
    const gain = gainById.get(memberId) ?? 0;
    if (!gain) return member;
    const current = exactNonnegativeInteger(member.exp, `persistent EXP for ${memberId}`);
    return { ...member, exp: current + gain };
  });
}
function addBagRewardItems(state, items) {
  if (!state.bag || typeof state.bag !== 'object' || Array.isArray(state.bag)) state.bag = {};
  state.bag.items ??= {};
  if (!state.bag.items || typeof state.bag.items !== 'object' || Array.isArray(state.bag.items)) throw new Error('New Core bag.items must be an object');
  const maxSlots = exactNonnegativeInteger(state.bag.maxSlots ?? 20, 'bag maxSlots');
  const maxPerSlot = exactNonnegativeInteger(state.bag.maxPerSlot ?? 99, 'bag maxPerSlot');
  if (maxSlots < 1 || maxPerSlot < 1) throw new Error('bag capacity must be positive');
  state.bag.maxSlots = maxSlots;
  state.bag.maxPerSlot = maxPerSlot;
  for (const item of items) {
    const id = String(item?.id ?? '');
    const quantity = exactNonnegativeInteger(item?.quantity, `reward quantity for ${id || '<missing>'}`);
    if (!id || quantity < 1) throw new Error('battle reward item requires id and positive quantity');
    const current = exactNonnegativeInteger(state.bag.items[id] ?? 0, `bag quantity for ${id}`);
    const occupied = Object.values(state.bag.items).filter((value) => Number(value) > 0).length;
    if (current === 0 && occupied >= maxSlots) throw new Error(`bag has no free slot for battle reward item: ${id}`);
    if (current + quantity > maxPerSlot) throw new Error(`bag stack limit exceeded for battle reward item: ${id}`);
    state.bag.items[id] = current + quantity;
  }
}
function battleOutcomeEvent(outcome, battleId) {
  if (outcome === 'win') return { type: 'BATTLE_WON', battleId };
  if (outcome === 'loss') return { type: 'BATTLE_LOST', battleId };
  return null;
}
function installBoard(state, slots) {
  state.board = slots.map((slot, index) => ({ ...structuredClone(slot), slot: index, consumed: false }));
  state.boardSelectionsRemaining = 8;
  state.mode = 'board';
  state.location = 'day_board';
}

export function step(inputState, command) {
  if (!inputState || !command?.type) throw new Error('state and command.type are required');
  const state = cloneGameState(inputState);

  switch (command.type) {
    case 'GENERATE_DAY_BOARD': {
      if (state.activeBattle || state.pendingBattleResult) throw new Error('GENERATE_DAY_BOARD cannot replace an unresolved battle result');
      if (state.mode !== 'board' && state.mode !== 'board_pending') throw new Error('GENERATE_DAY_BOARD requires board or board_pending mode');
      const generated = generateCanonicalDayBoard(state.rngState, state.day);
      state.rngState = generated.nextRngState;
      installBoard(state, generated.slots);
      return result(state, [{ type: 'BOARD_READY', day: state.day }]);
    }
    case 'BOARD_GENERATED': {
      if (!Array.isArray(command.slots) || command.slots.length !== 8) throw new Error('canonical Day Board requires 8 slots');
      if (state.activeBattle || state.pendingBattleResult) throw new Error('BOARD_GENERATED cannot replace an unresolved battle result');
      installBoard(state, command.slots);
      return result(state, [{ type: 'BOARD_READY', day: state.day }]);
    }
    case 'BOARD_ENCOUNTER_READY': {
      if (state.mode !== 'board' || !state.board) throw new Error('BOARD_ENCOUNTER_READY requires an active board');
      const slot = state.board[command.slot];
      if (!slot || slot.consumed) throw new Error('board slot unavailable');
      if (slot.kind !== 'wild' && slot.kind !== 'trainer') throw new Error('BOARD_ENCOUNTER_READY requires a battle slot');
      if (slot.encounter) throw new Error('board encounter is already prepared');
      if (!command.encounter || typeof command.encounter !== 'object' || Array.isArray(command.encounter)) throw new Error('BOARD_ENCOUNTER_READY requires encounter data');
      const hasRngBefore = command.rngStateBefore !== undefined;
      const hasRngAfter = command.nextRngState !== undefined;
      if (hasRngBefore !== hasRngAfter) throw new Error('BOARD_ENCOUNTER_READY RNG commit requires both before and after states');
      if (hasRngBefore) {
        const before = Number(command.rngStateBefore);
        const after = Number(command.nextRngState);
        if (!Number.isInteger(before) || before < 0 || before > 0xffffffff || !Number.isInteger(after) || after < 0 || after > 0xffffffff) {
          throw new Error('BOARD_ENCOUNTER_READY RNG states must be uint32 integers');
        }
        if ((state.rngState >>> 0) !== (before >>> 0)) throw new Error('BOARD_ENCOUNTER_READY RNG state is stale');
        state.rngState = after >>> 0;
      }
      slot.encounter = structuredClone(command.encounter);
      return result(state, [{ type: 'BOARD_ENCOUNTER_READY', slot: command.slot, kind: slot.kind }]);
    }
    case 'BOARD_SELECT': {
      if (state.mode !== 'board' || !state.board) throw new Error('BOARD_SELECT requires an active board');
      const slot = state.board[command.slot];
      if (!slot || slot.consumed) throw new Error('board slot unavailable');
      if (slot.kind !== 'wild') return result(state, [{ type: 'BOARD_SELECTION_DEFERRED', slot: command.slot, kind: slot.kind }]);
      if (!slot.encounter) throw new Error('wild board slot requires a prepared encounter before selection');
      const battleId = `${state.runId}:d${state.day}:s${command.slot}`;
      state.activeEncounter = { id: battleId, kind: 'wild', slot: command.slot, encounter: structuredClone(slot.encounter ?? null) };
      state.activeBattle = { id: battleId, status: 'requested', resultCommitted: false };
      state.mode = 'battle_pending';
      return result(state, [
        { type: 'ENCOUNTER_STARTED', encounterId: battleId, kind: 'wild' },
        { type: 'BATTLE_REQUESTED', battleId, encounter: structuredClone(state.activeEncounter) },
      ]);
    }
    case 'BATTLE_TERMINAL_RESULT': {
      const resultId = String(command.resultId || '');
      if (!resultId) throw new Error('resultId is required for exactly-once commit');
      const appliedResults = diagnosticsArray(state, 'appliedResultIds');
      if (appliedResults.includes(resultId)) return result(state, [{ type: 'BATTLE_RESULT_REPLAY_IGNORED', resultId }]);
      const battle = state.activeBattle;
      if (!battle || battle.id !== command.battleId) throw new Error('terminal result does not match active battle');
      const outcome = String(command.outcome ?? '');
      if (!outcome) throw new Error('terminal result outcome is required');
      const completedEncounter = structuredClone(state.activeEncounter);
      const slotIndex = completedEncounter?.slot;
      if (Number.isInteger(slotIndex) && state.board?.[slotIndex] && !state.board[slotIndex].consumed) {
        state.board[slotIndex].consumed = true;
        state.boardSelectionsRemaining = Math.max(0, state.boardSelectionsRemaining - 1);
      }
      appliedResults.push(resultId);
      state.activeBattle = null;
      state.activeEncounter = null;
      const outcomeEvent = battleOutcomeEvent(outcome, command.battleId);
      if (outcome === 'win') {
        const rewardId = `${resultId}:reward`;
        state.pendingBattleResult = {
          battleId: command.battleId,
          resultId,
          rewardId,
          outcome,
          kind: completedEncounter?.kind ?? null,
          encounter: completedEncounter?.encounter ?? null,
        };
        state.mode = 'battle_result';
        return result(state, [
          { type: 'BATTLE_RESULT_COMMITTED', battleId: command.battleId, resultId, outcome },
          ...(outcomeEvent ? [outcomeEvent] : []),
          { type: 'BATTLE_REWARD_REQUESTED', battleId: command.battleId, resultId, rewardId },
        ]);
      }
      state.pendingBattleResult = null;
      state.mode = 'board';
      state.location = 'day_board';
      return result(state, [
        { type: 'BATTLE_RESULT_COMMITTED', battleId: command.battleId, resultId, outcome },
        ...(outcomeEvent ? [outcomeEvent] : []),
        { type: 'BOARD_RETURNED', day: state.day },
      ], [{ type: 'REQUEST_SAVE', reason: 'battle_terminal_result' }]);
    }
    case 'BATTLE_REWARD_RESULT': {
      const rewardId = String(command.rewardId || '');
      if (!rewardId) throw new Error('rewardId is required for exactly-once reward commit');
      const appliedRewards = diagnosticsArray(state, 'appliedRewardIds');
      if (appliedRewards.includes(rewardId)) return result(state, [{ type: 'BATTLE_REWARD_REPLAY_IGNORED', rewardId }]);
      const pending = state.pendingBattleResult;
      if (!pending || pending.outcome !== 'win') throw new Error('battle reward requires a pending winning battle result');
      if (pending.rewardId !== rewardId) throw new Error('battle reward does not match pending reward id');
      const reward = resolveMaplessNormalBattleVictoryReward({
        kind: pending.kind,
        encounter: pending.encounter,
        party: state.party,
        recipientIds: command.recipientIds,
      });
      addBagRewardItems(state, reward.items);
      state.party = applyPartyExp(state.party, reward.partyExp);
      appliedRewards.push(rewardId);
      state.pendingBattleResult = null;
      state.mode = 'board';
      state.location = 'day_board';
      return result(state, [
        ...reward.partyExp.filter((entry) => entry.exp > 0).map((entry) => ({
          type: 'EXP_GAINED',
          memberId: entry.memberId,
          amount: entry.exp,
          battleId: pending.battleId,
          rewardId,
        })),
        ...reward.items.map((entry) => ({
          type: 'ITEM_REWARDED',
          itemId: entry.id,
          quantity: entry.quantity,
          battleId: pending.battleId,
          rewardId,
        })),
        { type: 'BATTLE_REWARD_COMMITTED', battleId: pending.battleId, resultId: pending.resultId, rewardId },
        { type: 'BOARD_RETURNED', day: state.day },
      ], [{ type: 'REQUEST_SAVE', reason: 'battle_reward_result' }]);
    }
    case 'ADVANCE_DAY': {
      const transitionId = String(command.transitionId || `${state.runId}:d${state.day}:advance`);
      const appliedTransitions = diagnosticsArray(state, 'appliedDayTransitionIds');
      if (appliedTransitions.includes(transitionId)) return result(state, [{ type: 'DAY_ADVANCE_REPLAY_IGNORED', transitionId }]);
      if (state.mode !== 'board' || !state.board || state.activeBattle || state.pendingBattleResult) throw new Error('ADVANCE_DAY requires a settled Day Board');
      if (command.confirmed !== true) return result(state, [{ type: 'DAY_ADVANCE_CANCELLED', day: state.day }]);
      appliedTransitions.push(transitionId);
      state.day += 1;
      state.board = null;
      state.boardSelectionsRemaining = 0;
      state.mode = 'board_pending';
      state.location = 'day_board';
      return result(state, [
        { type: 'DAY_ADVANCED', day: state.day, transitionId },
        { type: 'BOARD_GENERATION_REQUESTED', day: state.day },
      ], [{ type: 'REQUEST_SAVE', reason: 'day_advanced' }]);
    }
    default:
      throw new Error(`Unsupported New Core command: ${command.type}`);
  }
}
