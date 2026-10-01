import { createShowdownBattleSnapshot, projectMaplessPartyToShowdown } from '../core/battle/showdown-roundtrip.js';
import { createShowdownStreamSession } from '../core/battle/showdown-stream-session.js';
import { commitShowdownStreamTerminal } from '../core/battle/showdown-terminal-handoff.js';
import { createFreshRunState } from '../core/run/fresh-start.js';
import { step } from '../core/step.js';
import { createPresentationQueue, enqueuePresentationEvents } from '../presentation/semantic-event-queue.js';
import { beginSafariAction, cancelSafariAction, createSafariActionGate, releaseSafariAction } from './safari-action-gate.js';
import {
  clearNewCoreBrowserRun,
  hasNewCoreBrowserSave,
  loadNewCoreBrowserRun,
  saveNewCoreBrowserRun,
} from './browser-new-core-storage.js';
import { prepareNewCoreWildBoardSlot } from './p1-wild-encounter-driver.js';

function freezeResult(value) {
  return Object.freeze(value);
}

function terminalOutcome(resolved) {
  const winner = String(resolved?.winner ?? '');
  if (!resolved?.terminal) return null;
  if (winner === 'Mapless') return 'win';
  if (winner === 'Wild') return 'loss';
  return 'draw';
}

export function createP1PlayableController({
  showdown = null,
  storage = null,
  encounterDependencies = null,
  sessionFactory = createShowdownStreamSession,
  terminalCommit = commitShowdownStreamTerminal,
  presentationQueue = createPresentationQueue(),
  actionGate = createSafariActionGate(),
  battleSeed = [1, 2, 3, 4],
} = {}) {
  let state = null;
  let activeBattleSession = null;

  function requireState() {
    if (!state) throw new Error('P1 playable controller requires Fresh Start or Continue');
    return state;
  }

  function publish(events = []) {
    if (events.length) enqueuePresentationEvents(presentationQueue, events);
  }

  function saveIfRequested(effects = []) {
    const requested = effects.some((effect) => effect?.type === 'REQUEST_SAVE');
    if (requested && storage) saveNewCoreBrowserRun(storage, state);
    return requested;
  }

  function applyCore(command, { save = true } = {}) {
    const resolved = step(requireState(), command);
    state = resolved.state;
    publish(resolved.events);
    if (save) saveIfRequested(resolved.effects);
    return resolved;
  }

  function freshStart({ runId, seed } = {}) {
    if (activeBattleSession) throw new Error('cannot Fresh Start during an active Showdown session');
    state = createFreshRunState({ runId, seed });
    const board = applyCore({ type: 'GENERATE_DAY_BOARD' }, { save: false });
    return freezeResult({ state, events: board.events, effects: board.effects });
  }

  function continueRun() {
    if (!storage) throw new Error('Continue requires browser storage');
    if (activeBattleSession) throw new Error('cannot Continue during an active Showdown session');
    const loaded = loadNewCoreBrowserRun(storage);
    if (!loaded.found) return loaded;
    state = loaded.state;
    if (state.mode === 'board_pending') {
      applyCore({ type: 'GENERATE_DAY_BOARD' }, { save: false });
      saveNewCoreBrowserRun(storage, state);
    }
    return freezeResult({ ...loaded, state });
  }

  async function prepareWild(slot) {
    requireState();
    if (activeBattleSession) throw new Error('cannot prepare a Board encounter during an active Showdown session');
    const prepared = await prepareNewCoreWildBoardSlot(state, slot, encounterDependencies);
    state = prepared.state;
    publish(prepared.events ?? []);
    return freezeResult({ ...prepared, state });
  }

  async function startWildBattle(slot) {
    requireState();
    if (activeBattleSession) throw new Error('Showdown session is already active');
    const boardState = state;
    const selected = applyCore({ type: 'BOARD_SELECT', slot }, { save: false });
    const battleId = state.activeBattle?.id;
    const encounter = state.activeEncounter?.encounter;
    if (!battleId || !encounter?.pokemon) {
      state = boardState;
      throw new Error('prepared wild encounter Pokemon is required for Showdown start');
    }
    try {
      const playerTeam = createShowdownBattleSnapshot({ party: state.party }, { battleId }).party;
      const wildTeam = projectMaplessPartyToShowdown([encounter.pokemon]);
      const session = sessionFactory(showdown, {
        formatid: 'gen9customgame',
        seed: structuredClone(battleSeed),
        p1: { name: 'Mapless', team: playerTeam },
        p2: { name: 'Wild', team: wildTeam },
      });
      if (!session || typeof session.start !== 'function' || typeof session.fight !== 'function' || typeof session.resolvedState !== 'function') {
        throw new Error('P1 Showdown session factory returned an invalid session');
      }
      await session.start();
      activeBattleSession = { battleId, session };
      publish([{ type: 'BATTLE_STARTED', battleId }]);
      return freezeResult({ state, battleId, resolved: session.resolvedState(), events: selected.events });
    } catch (error) {
      state = boardState;
      throw error;
    }
  }

  async function fight(moveSlot, foeMoveSlot = 1) {
    requireState();
    if (!activeBattleSession) throw new Error('FIGHT requires an active Showdown session');
    const action = beginSafariAction(actionGate, { type: 'FIGHT', moveSlot });
    if (!action) return freezeResult({ accepted: false, state, resolved: activeBattleSession.session.resolvedState() });
    try {
      await Promise.all([
        activeBattleSession.session.fight('p1', moveSlot),
        activeBattleSession.session.fight('p2', foeMoveSlot),
      ]);

      const { battleId, session } = activeBattleSession;
      const resolved = session.resolvedState();
      if (!resolved.terminal) {
        releaseSafariAction(actionGate, action.token);
        return freezeResult({ accepted: true, terminal: false, state, resolved });
      }

      const committed = terminalCommit(state, { battleId, session });
      state = committed.state;
      const outcome = terminalOutcome(resolved);
      const terminal = applyCore({
        type: 'BATTLE_TERMINAL_RESULT',
        battleId,
        resultId: `showdown-terminal:${battleId}`,
        outcome,
      }, { save: outcome !== 'win' });
      activeBattleSession = null;
      releaseSafariAction(actionGate, action.token);
      return freezeResult({
        accepted: true,
        terminal: true,
        outcome,
        state,
        resolved,
        partyCommitted: committed.committed,
        duplicatePartyCommit: committed.duplicate,
        events: terminal.events,
        effects: terminal.effects,
      });
    } catch (error) {
      cancelSafariAction(actionGate, action.token);
      throw error;
    }
  }

  function commitReward(recipientIds) {
    const pending = requireState().pendingBattleResult;
    if (!pending) throw new Error('no pending battle reward');
    const committed = applyCore({
      type: 'BATTLE_REWARD_RESULT',
      rewardId: pending.rewardId,
      recipientIds,
    });
    return freezeResult({ ...committed, state });
  }

  function advanceDay({ confirmed = true, transitionId = null } = {}) {
    requireState();
    const command = { type: 'ADVANCE_DAY', confirmed };
    if (transitionId) command.transitionId = transitionId;
    const advanced = applyCore(command, { save: false });
    if (!confirmed) return freezeResult({ ...advanced, state });
    const generationRequested = advanced.events.some((event) => event?.type === 'BOARD_GENERATION_REQUESTED');
    if (!generationRequested) return freezeResult({ ...advanced, state });
    const generated = applyCore({ type: 'GENERATE_DAY_BOARD' }, { save: false });
    if (storage && advanced.effects.some((effect) => effect?.type === 'REQUEST_SAVE')) saveNewCoreBrowserRun(storage, state);
    return freezeResult({
      state,
      events: [...advanced.events, ...generated.events],
      effects: advanced.effects,
    });
  }

  function saveNow() {
    if (!storage) throw new Error('Save requires browser storage');
    return saveNewCoreBrowserRun(storage, requireState());
  }

  function hasSave() {
    if (!storage) return false;
    return hasNewCoreBrowserSave(storage);
  }

  function clearSave() {
    if (!storage) throw new Error('Clear Save requires browser storage');
    return clearNewCoreBrowserRun(storage);
  }

  function snapshot() {
    return structuredClone(requireState());
  }

  return Object.freeze({
    freshStart,
    continueRun,
    prepareWild,
    startWildBattle,
    fight,
    commitReward,
    advanceDay,
    saveNow,
    hasSave,
    clearSave,
    snapshot,
    presentationQueue,
    actionGate,
  });
}
