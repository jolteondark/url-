import { createShowdownStreamSession } from '../core/battle/showdown-stream-session.js';
import { commitShowdownStreamTerminal } from '../core/battle/showdown-terminal-handoff.js';
import { createShowdownBattleSnapshot, projectMaplessPartyToShowdown } from '../core/battle/showdown-roundtrip.js';
import { drawShowdownBattleSeed, drawWildShowdownMove } from '../core/battle/battle-rng.js';
import { projectShowdownRoundSemanticEvents } from '../core/battle/showdown-semantic-events.js';
import { serializeNewCoreSave, restoreNewCoreSave } from '../core/persistence.js';
import { createFreshRunState } from '../core/run/fresh-start.js';
import { step } from '../core/step.js';
import {
  createPresentationQueue,
  enqueuePresentationEvents,
  shiftPresentationJob,
  snapshotPresentationQueue,
} from '../presentation/semantic-event-queue.js';
import {
  beginSafariAction,
  cancelSafariAction,
  createSafariActionGate,
  releaseSafariAction,
  snapshotSafariActionGate,
} from './safari-action-gate.js';
import { prepareNewCoreWildBoardSlot } from './p1-wild-encounter-driver.js';

function clone(value) { return structuredClone(value); }

export function createP1PlayableSession(options = {}) {
  const playerName = String(options.playerName ?? 'Mapless');
  const battleSessionFactory = options.battleSessionFactory ?? createShowdownStreamSession;
  const terminalCommitter = options.terminalCommitter ?? commitShowdownStreamTerminal;
  if (battleSessionFactory === createShowdownStreamSession && !options.showdown) {
    throw new Error('P1 playable session requires the pinned Showdown surface');
  }
  const queue = createPresentationQueue();
  const gate = createSafariActionGate({
    now: options.now,
    slowActionThresholdMs: options.slowActionThresholdMs ?? null,
  });
  const saveStore = options.saveStore ?? null;
  let state = null;
  let battle = null;
  let lastSerializedSave = null;

  async function persistEffects(effects) {
    for (const effect of effects ?? []) {
      if (effect?.type !== 'REQUEST_SAVE') continue;
      const serialized = serializeNewCoreSave(state);
      lastSerializedSave = serialized;
      if (saveStore?.write) await saveStore.write(serialized, effect.reason);
    }
  }

  async function acceptCoreResult(coreResult) {
    state = coreResult.state;
    enqueuePresentationEvents(queue, coreResult.events ?? []);
    await persistEffects(coreResult.effects ?? []);
    return coreResult;
  }

  async function command(commandInput) {
    if (!state) throw new Error('P1 playable session has no active run');
    return acceptCoreResult(step(state, commandInput));
  }

  async function freshStart({ runId, seed } = {}) {
    state = createFreshRunState({ runId, seed });
    battle = null;
    await acceptCoreResult(step(state, { type: 'GENERATE_DAY_BOARD' }));
    return snapshot();
  }

  async function continueFrom(serialized) {
    state = restoreNewCoreSave(serialized);
    battle = null;
    if (state.mode === 'board_pending' && state.board === null) {
      await acceptCoreResult(step(state, { type: 'GENERATE_DAY_BOARD' }));
    }
    return snapshot();
  }

  async function prepareWild(slot) {
    if (!state) throw new Error('P1 playable session has no active run');
    const prepared = await prepareNewCoreWildBoardSlot(state, slot, options.encounterDependencies ?? null);
    await acceptCoreResult(prepared);
    return prepared;
  }

  async function selectWild(slot) {
    await command({ type: 'BOARD_SELECT', slot });
    const battleId = state.activeBattle?.id;
    const encounter = state.activeEncounter?.encounter;
    if (!battleId || !encounter?.pokemon) throw new Error('selected wild encounter is not battle-ready');

    const seed = drawShowdownBattleSeed(state.rngState);
    await command({
      type: 'BATTLE_RNG_ADVANCED',
      battleId,
      rngStateBefore: state.rngState,
      nextRngState: seed.nextRngState,
    });
    const playerTeam = createShowdownBattleSnapshot({ party: state.party }, { battleId }).party;
    const wildTeam = projectMaplessPartyToShowdown([encounter.pokemon]);
    const battleSession = battleSessionFactory(options.showdown, {
      formatid: 'gen9customgame',
      seed: seed.seed,
      p1: { name: playerName, team: playerTeam },
      p2: { name: 'Wild', team: wildTeam },
    });
    await battleSession.start();
    battle = { id: battleId, session: battleSession, encounter: clone(encounter), seed: [...seed.seed] };
    enqueuePresentationEvents(queue, [
      { type: 'BATTLE_STARTED', battleId },
      { type: 'POKEMON_SENT_OUT', side: 'player', maplessId: state.party[0]?.id ?? null, species: state.party[0]?.species ?? null },
      { type: 'POKEMON_SENT_OUT', side: 'foe', maplessId: encounter.pokemon.id, species: encounter.pokemon.species },
    ]);
    return snapshot();
  }

  async function fight(moveSlot = 1) {
    if (!battle) throw new Error('P1 playable session has no active battle');
    const active = beginSafariAction(gate, { type: 'FIGHT', moveSlot });
    if (!active) return Object.freeze({ accepted: false, state: clone(state) });
    try {
      const before = battle.session.resolvedState();
      if (before.terminal) throw new Error('cannot FIGHT after terminal Showdown state');
      const ai = drawWildShowdownMove(state.rngState, before.p2[0]?.moves ?? []);
      await command({
        type: 'BATTLE_RNG_ADVANCED',
        battleId: battle.id,
        rngStateBefore: state.rngState,
        nextRngState: ai.nextRngState,
      });
      await Promise.all([
        battle.session.fight('p1', moveSlot),
        battle.session.fight('p2', ai.moveSlot),
      ]);
      const after = battle.session.resolvedState();
      enqueuePresentationEvents(queue, projectShowdownRoundSemanticEvents(before, after, {
        playerMoveSlot: moveSlot,
        foeMoveSlot: ai.moveSlot,
      }));

      if (after.terminal) {
        const committed = terminalCommitter(state, { battleId: battle.id, session: battle.session });
        if (!committed.committed && !committed.duplicate) throw new Error('terminal Showdown state was not committed');
        state = committed.state;
        const outcome = after.winner === playerName ? 'win' : 'loss';
        await acceptCoreResult(step(state, {
          type: 'BATTLE_TERMINAL_RESULT',
          battleId: battle.id,
          resultId: `showdown-terminal:${battle.id}`,
          outcome,
        }));
        battle = null;
      }
      releaseSafariAction(gate, active.token);
      return Object.freeze({ accepted: true, terminal: Boolean(after.terminal), state: clone(state), resolved: after });
    } catch (error) {
      cancelSafariAction(gate, active.token);
      throw error;
    }
  }

  async function commitReward(recipientIds = null) {
    const pending = state?.pendingBattleResult;
    if (!pending) throw new Error('P1 playable session has no pending battle reward');
    const recipients = recipientIds ?? state.party.filter((member) => Number(member.hp) > 0 && !member.fainted).map((member) => String(member.id ?? member.personalId));
    return command({ type: 'BATTLE_REWARD_RESULT', rewardId: pending.rewardId, recipientIds: recipients });
  }

  async function advanceDay(confirmed = true) {
    const transitionId = `${state.runId}:d${state.day}:advance`;
    const advanced = await command({ type: 'ADVANCE_DAY', transitionId, confirmed });
    if (confirmed) await command({ type: 'GENERATE_DAY_BOARD' });
    return advanced;
  }

  function serialize() {
    if (!state) throw new Error('P1 playable session has no active run');
    return serializeNewCoreSave(state);
  }

  function snapshot() {
    return Object.freeze({
      state: state ? clone(state) : null,
      battle: battle ? Object.freeze({ id: battle.id, encounter: clone(battle.encounter), seed: [...battle.seed] }) : null,
      presentation: snapshotPresentationQueue(queue),
      actionGate: snapshotSafariActionGate(gate),
      lastSerializedSave,
    });
  }

  function nextPresentationJob() {
    return shiftPresentationJob(queue);
  }

  return Object.freeze({
    freshStart,
    continueFrom,
    prepareWild,
    selectWild,
    fight,
    commitReward,
    advanceDay,
    serialize,
    snapshot,
    nextPresentationJob,
  });
}
