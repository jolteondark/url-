import { canSwitchIn, resolveSwitchFlow } from "./battle-switch-flow.js";

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function normalizePartyForSwitch(party, activePartyIndex) {
  const source = Array.isArray(party) ? clone(party) : [];
  const active = Number(activePartyIndex);
  if (!Number.isInteger(active) || active < 0 || active >= source.length) {
    throw new RangeError("playerActivePartyIndex out of range");
  }
  return source.map((pokemon, index) => ({
    ...(pokemon ?? {}),
    fainted: Boolean(pokemon?.fainted || Number(pokemon?.hp ?? 0) <= 0),
    active: index === active,
  }));
}

function replacementOptions(party) {
  return party.map((pokemon, partyIndex) => {
    const switchEligibility = canSwitchIn({ idxParty: partyIndex, party });
    return {
      partyIndex,
      pokemon: clone(pokemon),
      canSwitchIn: switchEligibility.ok,
      switchEligibility,
    };
  });
}

function applyActiveReference(party, activePartyIndex) {
  return party.map((pokemon, index) => ({ ...pokemon, active: index === activePartyIndex }));
}

export function resolveBrowserPlayerReplacementContinuation({
  battleContinuationHandoff,
  replacementPartyIndex = null,
  partyOrder = null,
  idxBattler = 0,
  sideSize = 1,
} = {}) {
  const handoff = clone(battleContinuationHandoff ?? {});
  if (Number(handoff.decision ?? 0) !== 0 || !handoff.playerReplacementRequired) {
    return {
      result: "no_replacement_required",
      replacementOptions: [],
      switchResolution: null,
      operations: [],
      battleContinuationHandoff: handoff,
      activePlayer: clone(handoff.playerParty?.[handoff.playerActivePartyIndex] ?? null),
      partyOrder: clone(partyOrder),
    };
  }

  const party = normalizePartyForSwitch(handoff.playerParty, handoff.playerActivePartyIndex);
  const options = replacementOptions(party);
  if (replacementPartyIndex === null || replacementPartyIndex === undefined) {
    return {
      result: "replacement_selection_required",
      replacementOptions: options,
      switchResolution: null,
      operations: [],
      battleContinuationHandoff: handoff,
      activePlayer: clone(party[handoff.playerActivePartyIndex] ?? null),
      partyOrder: clone(partyOrder),
    };
  }

  const replacement = Number(replacementPartyIndex);
  if (!Number.isInteger(replacement) || replacement < 0 || replacement >= party.length) {
    throw new RangeError("replacementPartyIndex out of range");
  }
  const selected = options[replacement];
  if (!selected?.canSwitchIn) {
    return {
      result: "switch_rejected",
      replacementPartyIndex: replacement,
      replacementOptions: options,
      switchResolution: null,
      operations: [{
        op: "switch_eligibility",
        ok: false,
        phase: "switch_in",
        reason: selected?.switchEligibility?.reason ?? "invalid_party_index",
        source: "player_replacement_continuation",
      }],
      battleContinuationHandoff: handoff,
      activePlayer: clone(party[handoff.playerActivePartyIndex] ?? null),
      partyOrder: clone(partyOrder),
    };
  }

  const switchResolution = resolveSwitchFlow({
    idxBattler: Number(idxBattler),
    idxParty: replacement,
    battlerPartyIndex: Number(handoff.playerActivePartyIndex),
    partyOrder: Array.isArray(partyOrder) ? [...partyOrder] : party.map((_, index) => index),
    party,
    battler: { fainted: true },
    sideSize: Number(sideSize),
    recalculateTurnOrder: false,
  });
  if (switchResolution.result !== "switched") {
    return {
      result: "switch_rejected",
      replacementPartyIndex: replacement,
      replacementOptions: options,
      switchResolution,
      operations: (switchResolution.operations ?? []).map((operation) => ({
        ...operation,
        source: "player_replacement_continuation",
      })),
      battleContinuationHandoff: handoff,
      activePlayer: null,
      partyOrder: clone(switchResolution.partyOrder ?? partyOrder),
    };
  }

  const nextParty = applyActiveReference(party, switchResolution.activePartyIndex);
  const nextHandoff = {
    ...handoff,
    playerParty: nextParty,
    playerActivePartyIndex: switchResolution.activePartyIndex,
    playerActiveFainted: false,
    playerReplacementRequired: false,
  };
  const operations = (switchResolution.operations ?? []).map((operation) => ({
    ...operation,
    source: "player_replacement_continuation",
  }));
  return {
    result: "continued_with_replacement",
    replacementPartyIndex: replacement,
    replacementOptions: options,
    switchResolution,
    operations,
    partyOrder: clone(switchResolution.partyOrder),
    battleContinuationHandoff: nextHandoff,
    activePlayer: clone(nextParty[switchResolution.activePartyIndex]),
  };
}
