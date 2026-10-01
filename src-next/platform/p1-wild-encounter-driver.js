import { step } from '../core/step.js';
import { prepareBrowserGeneralWildEncounter } from './browser-general-wild-encounter.js';

export async function prepareNewCoreWildBoardSlot(state, slot, dependencies = null) {
  const event = state?.board?.[slot];
  if (!event || event.kind !== 'wild' || !event.type) throw new Error('prepared New Core wild board slot with type is required');
  const prepared = await prepareBrowserGeneralWildEncounter({
    rngState: state.rngState,
    day: state.day,
    slot,
    requiredType: event.type,
    battleId: `${state.runId}:d${state.day}:s${slot}`,
  }, dependencies);
  const committed = step(state, {
    type: 'BOARD_ENCOUNTER_READY',
    slot,
    encounter: prepared.encounter,
    rngStateBefore: prepared.rngStateBefore,
    nextRngState: prepared.nextRngState,
  });
  return Object.freeze({ ...committed, prepared });
}
