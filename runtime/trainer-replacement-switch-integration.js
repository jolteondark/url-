import { resolveSwitchFlow } from "./battle-switch-flow.js";
function clone(value) { return structuredClone(value); }
export function buildResolvedTrainerReplacementSwitch({ trainerParty = [], activePartyIndex = 0, partyOrder = null, replacementPartyIndex, idxBattler = 1, sideSize = 1, recalculateTurnOrder = false } = {}) {
  const replacement = Number(replacementPartyIndex); const active = Number(activePartyIndex);
  if (!Number.isInteger(replacement) || replacement < 0) throw new TypeError("replacementPartyIndex must be a non-negative integer resolved by the canonical trainer replacement owner");
  if (!Number.isInteger(active) || active < 0) throw new TypeError("activePartyIndex must be a non-negative integer");
  const party = clone(Array.isArray(trainerParty) ? trainerParty : []); const order = Array.isArray(partyOrder) ? [...partyOrder] : party.map((_, index) => index);
  if (active >= party.length || replacement >= party.length) throw new RangeError("trainer party index out of range");
  return { idxBattler: Number(idxBattler), idxParty: replacement, battlerPartyIndex: active, partyOrder: order, party, battler: { fainted: Boolean(party[active]?.fainted) }, sideSize: Number(sideSize), recalculateTurnOrder: Boolean(recalculateTurnOrder) };
}
export function resolveTrainerReplacementSwitch(input = {}) { return resolveSwitchFlow(buildResolvedTrainerReplacementSwitch(input)); }
