function rubyRound(value) {
  const n = Number(value ?? 0);
  return n >= 0 ? Math.floor(n + 0.5) : Math.ceil(n - 0.5);
}

export function reduceHpCanonical(input = {}) {
  const oldHp = Number(input.hp ?? 0);
  const totalHp = Number(input.totalHp ?? oldHp);
  const alreadyFainted = input.fainted === undefined ? oldHp <= 0 : Boolean(input.fainted);
  let amount = rubyRound(input.amount ?? 0);
  if (amount > oldHp) amount = oldHp;
  if (amount < 1 && !alreadyFainted) amount = 1;
  const hpAfter = oldHp - amount;
  if (hpAfter < 0) throw new Error("HP less than 0");
  if (hpAfter > totalHp) throw new Error("HP greater than total HP");

  const registerDamage = input.registerDamage === undefined ? true : Boolean(input.registerDamage);
  const anyAnim = input.anyAnim === undefined ? true : Boolean(input.anyAnim);
  const anim = input.anim === undefined ? true : Boolean(input.anim);
  let droppedBelowHalfHP = Boolean(input.droppedBelowHalfHP);
  let tookDamageThisRound = Boolean(input.tookDamageThisRound);
  let tookMoveDamageThisRound = Boolean(input.tookMoveDamageThisRound);
  if (amount > 0 && registerDamage) {
    if (hpAfter < totalHp / 2 && hpAfter + amount >= totalHp / 2) droppedBelowHalfHP = true;
    tookDamageThisRound = true;
    tookMoveDamageThisRound = true;
  }
  const operations = [];
  if (anyAnim && amount > 0) operations.push({ op: "scene_hp_changed", oldHp, hpAfter, anim });
  return { amount, oldHp, hpAfter, droppedBelowHalfHP, tookDamageThisRound, tookMoveDamageThisRound, operations };
}

export function faintCanonical(input = {}) {
  const hp = Number(input.hp ?? 0);
  if (hp > 0) return { applied: false, reason: "hp_positive", status: input.status ?? "NONE", statusCount: Number(input.statusCount ?? 0), operations: [] };
  if (Boolean(input.alreadyFainted)) return { applied: false, reason: "already_fainted", status: input.status ?? "NONE", statusCount: Number(input.statusCount ?? 0), operations: [] };

  const operations = [];
  if (input.showMessage === undefined || Boolean(input.showMessage)) operations.push({ op: "display_fainted" });
  else operations.push({ op: "debug_fainted" });
  operations.push({ op: "scene_faint_battler" });
  if (Boolean(input.opposes)) operations.push({ op: "set_defeated" });
  operations.push({ op: "init_effects", batonPass: false });
  operations.push({ op: "reset_status", status: "NONE", statusCount: 0 });

  if (Boolean(input.pokemonPresent) && Boolean(input.internalBattle)) {
    const level = Number(input.level ?? 0);
    const opposingLevels = Array.isArray(input.opposingLevels) ? input.opposingLevels.map(Number) : [];
    const badLoss = opposingLevels.some((opponentLevel) => opponentLevel >= level + 30);
    operations.push({ op: "change_happiness", kind: badLoss ? "faintbad" : "faint" });
  }
  operations.push({ op: "on_leaving_battle" });
  if (Boolean(input.mega)) operations.push({ op: "make_unmega" });
  if (Boolean(input.primal)) operations.push({ op: "make_unprimal" });
  operations.push({ op: "clear_choice" });
  operations.push({ op: "set_last_round_fainted", turnCount: Number(input.turnCount ?? 0) });
  if (Boolean(input.partyDirectDamageTracked) && Boolean(input.ownedByPlayer)) operations.push({ op: "reset_party_direct_damage" });
  operations.push({ op: "abilities_on_fainting" });
  operations.push({ op: "end_primordial_weather" });
  return { applied: true, status: "NONE", statusCount: 0, operations };
}

export function resolveHpFaintActionCanonical(action = {}) {
  const resolved = { ...action };
  if (!resolved.accuracyHit || resolved.hpBefore === undefined || resolved.calculatedDamage === undefined) return resolved;
  const hpResolution = reduceHpCanonical({
    hp: resolved.hpBefore,
    totalHp: resolved.totalHp ?? resolved.hpBefore,
    amount: resolved.calculatedDamage,
    ...(resolved.hpInput ?? {}),
  });
  resolved.hpAfter = hpResolution.hpAfter;
  resolved.hpReductionResolution = hpResolution;
  if (hpResolution.hpAfter <= 0) {
    const faintResolution = faintCanonical({ hp: hpResolution.hpAfter, ...(resolved.faintInput ?? {}) });
    resolved.faintResolution = faintResolution;
    resolved.fainted = faintResolution.applied;
  } else {
    resolved.fainted = false;
  }
  return resolved;
}
