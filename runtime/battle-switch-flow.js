function int(value, name) {
  const n = Number(value);
  if (!Number.isInteger(n)) throw new TypeError(`${name} must be an integer`);
  return n;
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }
export function canSwitchIn(input) {
  const idxParty = int(input.idxParty, "idxParty");
  if (idxParty < 0) return { ok: true, reason: "lax" };
  const party = input.party ?? [];
  if (idxParty >= party.length || !party[idxParty]) return { ok: false, reason: "invalid_party_index" };
  const p = party[idxParty];
  if (p.egg) return { ok: false, reason: "egg" };
  if (p.owned === false) return { ok: false, reason: "not_owner" };
  if (p.fainted) return { ok: false, reason: "fainted" };
  if (p.active) return { ok: false, reason: "already_active" };
  return { ok: true, reason: "ok" };
}
export function canSwitchOut(input) {
  const b = input.battler ?? {};
  if (b.fainted) return { ok: true, reason: "fainted" };
  if (b.certainSwitchAbility) return { ok: true, reason: "ability_override" };
  if (b.certainSwitchItem) return { ok: true, reason: "item_override" };
  if (b.ghostBypass) return { ok: true, reason: "ghost_override" };
  if (b.trapped) return { ok: false, reason: "trapped" };
  if (b.trappingAbility) return { ok: false, reason: "trapping_ability" };
  if (b.trappingItem) return { ok: false, reason: "trapping_item" };
  return { ok: true, reason: "ok" };
}
export function canSwitch(input) {
  const incoming = canSwitchIn(input);
  if (!incoming.ok) return { ok: false, phase: "switch_in", reason: incoming.reason };
  const idxParty = int(input.idxParty, "idxParty");
  for (const choice of input.sameSideChoices ?? []) if (choice.action === "SwitchOut" && int(choice.partyIndex, "partyIndex") === idxParty) return { ok: false, phase: "duplicate_choice", reason: "already_selected" };
  const outgoing = canSwitchOut(input);
  if (!outgoing.ok) return { ok: false, phase: "switch_out", reason: outgoing.reason };
  return { ok: true, phase: "ok", reason: "ok" };
}
export function resolveSwitchFlow(input) {
  const party = clone(input.party ?? []);
  const partyOrder = [...(input.partyOrder ?? party.map((_, i) => i))];
  const idxBattler = int(input.idxBattler ?? 0, "idxBattler");
  const idxParty = int(input.idxParty, "idxParty");
  const battlerPartyIndex = int(input.battlerPartyIndex, "battlerPartyIndex");
  const operations = [];
  const eligibility = canSwitch({ ...input, party });
  operations.push({ op: "switch_eligibility", ...eligibility });
  if (!eligibility.ok) return { result: "rejected", eligibility, partyOrder, activePartyIndex: battlerPartyIndex, operations };
  operations.push({ op: "register_switch", idxBattler, idxParty });
  if (input.registerOnly) return { result: "registered", eligibility, partyOrder, activePartyIndex: battlerPartyIndex, operations };
  const outgoing = input.battler ?? {};
  if (!outgoing.fainted) operations.push({ op: "recall", idxBattler });
  operations.push({ op: "abilities_on_switch_out", idxBattler });
  if (int(input.sideSize ?? 1, "sideSize") === 1) operations.push({ op: "show_party_lineup", side: idxBattler & 1 });
  if (!input.randomReplacement) operations.push({ op: "messages_on_replace", idxBattler, idxParty });
  operations.push({ op: "initialize_battler", idxBattler, idxParty, batonPass: Boolean(input.batonPass) });
  if (idxParty < 0 || idxParty >= party.length) throw new RangeError("idxParty must reference an incoming Pokemon for execution");
  if (battlerPartyIndex < 0 || battlerPartyIndex >= partyOrder.length || idxParty >= partyOrder.length) throw new RangeError("party order indices out of range");
  [partyOrder[idxParty], partyOrder[battlerPartyIndex]] = [partyOrder[battlerPartyIndex], partyOrder[idxParty]];
  operations.push({ op: "swap_party_order", a: idxParty, b: battlerPartyIndex, partyOrder: [...partyOrder] });
  operations.push({ op: "send_out", idxBattler, idxParty, pokemon: party[idxParty].name ?? null });
  if (input.recalculateTurnOrder) operations.push({ op: "recalculate_priority", full: false, battlers: [idxBattler] });
  operations.push({ op: "active_runtime_reference", idxBattler, partyIndex: idxParty, pokemon: party[idxParty].name ?? null });
  return { result: "switched", eligibility, partyOrder, activePartyIndex: idxParty, operations };
}
