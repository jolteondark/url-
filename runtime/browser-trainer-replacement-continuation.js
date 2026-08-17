import { resolveDefaultChooseNewEnemyCanonical } from "./battle-core-trainer-replacement.js";
import { canSwitchIn, resolveSwitchFlow } from "./battle-switch-flow.js";
function clone(value) { return structuredClone(value); }
function normalizePartyForSwitch(party, activePartyIndex) {
  const source = Array.isArray(party) ? clone(party) : [];
  const active = Number(activePartyIndex);
  if (!Number.isInteger(active) || active < 0 || active >= source.length) throw new RangeError("foeActivePartyIndex out of range");
  return source.map((pokemon, index) => { const entry = { ...(pokemon ?? {}) }; entry.fainted = Boolean(entry.fainted || Number(entry.hp ?? 0) <= 0); entry.active = index === active; return entry; });
}
function chooserPartyFromSwitchOwner(party, replacementDecisionInput = {}) {
  const supplied = Array.isArray(replacementDecisionInput.party) ? replacementDecisionInput.party : [];
  return party.map((pokemon, index) => { const eligibility = canSwitchIn({ idxParty: index, party }); return { ...(supplied[index] ?? {}), canSwitchIn: eligibility.ok, switchEligibility: eligibility }; });
}
function applyActiveReference(party, activePartyIndex) { return party.map((pokemon, index) => ({ ...pokemon, active: index === activePartyIndex })); }
export function resolveBrowserTrainerReplacementContinuation({ battleContinuationHandoff, replacementDecisionInput = {}, partyOrder = null, idxBattler = 1, sideSize = 1 } = {}) {
  const handoff = clone(battleContinuationHandoff ?? {});
  if (Number(handoff.decision ?? 0) !== 0 || !handoff.foeReplacementRequired) return { result: "no_replacement_required", replacementResolution: null, switchResolution: null, operations: [], battleContinuationHandoff: handoff, activeFoe: handoff.foeParty?.[handoff.foeActivePartyIndex] ?? null };
  const party = normalizePartyForSwitch(handoff.foeParty, handoff.foeActivePartyIndex);
  const chooserParty = chooserPartyFromSwitchOwner(party, replacementDecisionInput);
  const replacementResolution = resolveDefaultChooseNewEnemyCanonical({ ...replacementDecisionInput, party: chooserParty });
  const replacementPartyIndex = Number(replacementResolution.replacementPartyIndex);
  if (!Number.isInteger(replacementPartyIndex) || replacementPartyIndex < 0) return { result: "replacement_unavailable", replacementResolution, switchResolution: null, operations: [], battleContinuationHandoff: handoff, activeFoe: null };
  if (replacementPartyIndex >= party.length) throw new RangeError("trainer party index out of range");
  const activePartyIndex = Number(handoff.foeActivePartyIndex);
  const switchResolution = resolveSwitchFlow({
    idxBattler: Number(idxBattler),
    idxParty: replacementPartyIndex,
    battlerPartyIndex: activePartyIndex,
    partyOrder: Array.isArray(partyOrder) ? [...partyOrder] : party.map((_, index) => index),
    party: clone(party),
    battler: { fainted: Boolean(party[activePartyIndex]?.fainted) },
    sideSize: Number(sideSize),
    recalculateTurnOrder: false,
  });
  if (switchResolution.result !== "switched") return { result: "switch_rejected", replacementResolution, switchResolution, operations: switchResolution.operations ?? [], battleContinuationHandoff: handoff, activeFoe: null };
  const nextParty = applyActiveReference(party, switchResolution.activePartyIndex);
  const nextHandoff = { ...handoff, foeParty: nextParty, foeActivePartyIndex: switchResolution.activePartyIndex, foeActiveFainted: false, foeReplacementRequired: false };
  const operations = (switchResolution.operations ?? []).map((operation) => ({ ...operation, source: "trainer_replacement_continuation" }));
  return { result: "continued_with_replacement", replacementPartyIndex, replacementResolution, switchResolution, operations, partyOrder: clone(switchResolution.partyOrder), battleContinuationHandoff: nextHandoff, activeFoe: clone(nextParty[switchResolution.activePartyIndex]) };
}
