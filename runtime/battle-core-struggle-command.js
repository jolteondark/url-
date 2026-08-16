export const STRUGGLE_COMMAND_SOURCE = Object.freeze({
  battleActionScriptId: 836019,
  autoChooseSliceSha256: "70c90028101598f5eb10e355cf1390890c32471121a58d8d383bbd65aafd2361",
  commandPhaseScriptId: 297547,
  fightMenuSliceSha256: "e79c2186f8f35f2534e060baf03285791f8adcc5afe0ae9fa047be76f826b09d",
  moveBaseEffectsScriptId: 832210,
  struggleMoveSliceSha256: "3ce53c1f04c3b20ded2e6160cd6ecc852ade5881aa27fc17cf3b9338e8a2730a",
  aiChooseMoveScriptId: 686327,
  aiAutoChooseSliceSha256: "d7c14ea76452c931cb2328086a59a8ccd2af6cb77216eedbed820a0678287069",
});

export const STRUGGLE_MOVE_CANONICAL = Object.freeze({
  id: "STRUGGLE",
  name: "Struggle",
  function_code: "Struggle",
  power: 50,
  type: null,
  category: "Physical",
  accuracy: 0,
  priority: 0,
  total_pp: 0,
  canonical_pp: -1,
  target: "RandomNearFoe",
  flags: Object.freeze(["Contact", "CanProtect"]),
  addl_effect: 0,
});

export function resolveOpponentAutoMoveCommandCanonical({ fainted = false } = {}) {
  if (fainted) return { command: "none", moveIndex: 0, moveId: null, autoChosen: true, struggle: false, source: STRUGGLE_COMMAND_SOURCE };
  return { command: "move", moveIndex: -1, moveId: STRUGGLE_MOVE_CANONICAL.id, targetIndex: -1, autoChosen: true, struggle: true, moveMaster: STRUGGLE_MOVE_CANONICAL, source: STRUGGLE_COMMAND_SOURCE };
}

export function applyStruggleRecoilCanonical({ userHp, totalHp, executed = true, targetUnaffected = false } = {}) {
  const hpBefore = Math.max(0, Math.trunc(Number(userHp ?? 0)));
  const maxHp = Math.max(0, Math.trunc(Number(totalHp ?? 0)));
  if (!executed || targetUnaffected) return { applied: false, damage: 0, hpBefore, hpAfter: hpBefore, fainted: hpBefore <= 0 };
  const damage = Math.round(maxHp / 4);
  const hpAfter = Math.max(0, hpBefore - damage);
  return { applied: true, damage, hpBefore, hpAfter, fainted: hpAfter <= 0 };
}
