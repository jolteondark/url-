// Canonical Mapless v0.9.108 HP-changing move functions.
// Source scripts (private source-v0.9.108; raw source is not redistributed):
// Move_BaseEffects SHA-256 7965c84bf841b5974ed856acbcc52d678ce3b130dd1e4351536c688137127237
// MoveEffects_MoveAttributes SHA-256 cd234d480086a25039a330a8eeda2d6ea1f9b3b864160b8a3dfbf12131269acb
// MoveEffects_Healing SHA-256 eb3eb75f385d547f97a9495a407e55356d56e4e0d57e5340691eac53ce456e9b

function rubyRound(value) {
  const n = Number(value ?? 0);
  return n >= 0 ? Math.floor(n + 0.5) : Math.ceil(n - 0.5);
}

function positiveInt(value, fallback = 0) {
  const n = Math.trunc(Number(value ?? fallback));
  return Number.isFinite(n) ? Math.max(0, n) : Math.max(0, fallback);
}

function normalizeWeather(value) {
  return String(value ?? "None").trim().toUpperCase().replaceAll("_", "").replaceAll("-", "").replaceAll(" ", "");
}

export const CANONICAL_FIXED_DAMAGE_FUNCTIONS = new Set([
  "FixedDamage20",
  "FixedDamage40",
  "FixedDamageHalfTargetHP",
  "FixedDamageUserLevel",
  "UserFaintsFixedDamageUserHP",
]);

export function isCanonicalFixedDamageFunction(functionCode) {
  return CANONICAL_FIXED_DAMAGE_FUNCTIONS.has(String(functionCode ?? ""));
}

export function resolveCanonicalFixedDamage({ functionCode, actorHp, actorLevel, targetHp } = {}) {
  const code = String(functionCode ?? "");
  let damage = null;
  if (code === "FixedDamage20") damage = 20;
  if (code === "FixedDamage40") damage = 40;
  if (code === "FixedDamageHalfTargetHP") damage = rubyRound(positiveInt(targetHp) / 2);
  if (code === "FixedDamageUserLevel") damage = positiveInt(actorLevel);
  if (code === "UserFaintsFixedDamageUserHP") damage = positiveInt(actorHp);
  if (damage === null) return null;
  return Math.max(1, positiveInt(damage)); // FixedDamageMove#pbCalcDamage canonical minimum.
}

export function resolveCanonicalHpFunctionEffect({
  functionCode,
  resolvedDamage = 0,
  actorHp,
  actorMaxHp,
  actorStatus = "NONE",
  actorAbility = null,
  effectiveWeather = "None",
  targetAffected = true,
  moveExecuted = true,
  struggle = false,
} = {}) {
  const code = struggle ? "Struggle" : String(functionCode ?? "");
  const hpBefore = positiveInt(actorHp);
  const maxHp = Math.max(hpBefore, positiveInt(actorMaxHp, hpBefore));
  const actualDamage = positiveInt(resolvedDamage);
  const status = String(actorStatus ?? "NONE").toUpperCase();
  const ability = String(actorAbility ?? "").toUpperCase();
  const weather = normalizeWeather(effectiveWeather);
  let heal = 0;
  let selfDamage = 0;
  let selfKo = false;
  let restSleep = false;

  if (!moveExecuted) return { functionCode: code, hpBefore, hpAfter: hpBefore, heal: 0, selfDamage: 0, selfKo: false, restSleep: false };

  if (["HealUserByHalfOfDamageDone", "HealUserByHalfOfDamageDoneIfTargetAsleep", "HealUserByHalfOfDamageDoneBurnTarget"].includes(code)) {
    if (actualDamage > 0) heal = rubyRound(actualDamage / 2);
  } else if (code === "HealUserByThreeQuartersOfDamageDone") {
    if (actualDamage > 0) heal = rubyRound(actualDamage * 0.75);
  } else if (code === "HealUserHalfOfTotalHP") {
    heal = rubyRound(maxHp / 2);
  } else if (code === "HealUserDependingOnWeather") {
    if (["SUN", "HARSHSUN"].includes(weather)) heal = rubyRound(maxHp * 2 / 3);
    else if (["NONE", "STRONGWINDS"].includes(weather)) heal = rubyRound(maxHp / 2);
    else heal = rubyRound(maxHp / 4);
  } else if (code === "HealUserDependingOnSandstorm") {
    heal = weather === "SANDSTORM" ? rubyRound(maxHp * 2 / 3) : rubyRound(maxHp / 2);
  } else if (code === "HealUserFullyAndFallAsleep") {
    // Rest fails if already asleep, or if both HP and status need no restoration.
    if (status !== "SLEEP" && (hpBefore < maxHp || status !== "NONE")) {
      heal = maxHp - hpBefore;
      restSleep = true;
    }
  } else if (code === "RecoilQuarterOfDamageDealt") {
    if (targetAffected && ability !== "ROCKHEAD") selfDamage = Math.max(1, rubyRound(actualDamage / 4));
  } else if (["RecoilThirdOfDamageDealt", "RecoilThirdOfDamageDealtParalyzeTarget", "RecoilThirdOfDamageDealtBurnTarget"].includes(code)) {
    if (targetAffected && ability !== "ROCKHEAD") selfDamage = Math.max(1, rubyRound(actualDamage / 3));
  } else if (code === "RecoilHalfOfDamageDealt") {
    if (targetAffected && ability !== "ROCKHEAD") selfDamage = Math.max(1, rubyRound(actualDamage / 2));
  } else if (code === "RecoilHalfOfTotalHP") {
    if (targetAffected && ability !== "ROCKHEAD") selfDamage = Math.max(1, Math.ceil(maxHp / 2));
  } else if (code === "UserLosesHalfOfTotalHP") {
    selfDamage = Math.max(1, Math.ceil(maxHp / 2));
  } else if (code === "UserLosesHalfOfTotalHPExplosive") {
    selfDamage = Math.max(1, rubyRound(maxHp / 2));
  } else if (["UserFaintsExplosive", "UserFaintsPowersUpInMistyTerrainExplosive", "UserFaintsFixedDamageUserHP"].includes(code)) {
    selfDamage = hpBefore;
    selfKo = hpBefore > 0;
  } else if (code === "Struggle") {
    if (targetAffected) selfDamage = Math.max(1, rubyRound(maxHp / 4));
  }

  const healedHp = Math.min(maxHp, hpBefore + Math.max(0, heal));
  const appliedHeal = healedHp - hpBefore;
  const appliedSelfDamage = Math.min(healedHp, Math.max(0, selfDamage));
  const hpAfter = healedHp - appliedSelfDamage;
  return {
    functionCode: code,
    hpBefore,
    hpAfter,
    heal: appliedHeal,
    selfDamage: appliedSelfDamage,
    selfKo: selfKo || (appliedSelfDamage > 0 && hpAfter <= 0),
    restSleep,
    resolvedDamage: actualDamage,
    targetAffected: Boolean(targetAffected),
  };
}

export function buildRestStatusInputCanonical({ functionCode, actorStatus, actorHp, actorMaxHp, battlerIndex } = {}) {
  if (String(functionCode ?? "") !== "HealUserFullyAndFallAsleep") return null;
  const status = String(actorStatus ?? "NONE").toUpperCase();
  const hp = positiveInt(actorHp);
  const maxHp = Math.max(hp, positiveInt(actorMaxHp, hp));
  if (status === "SLEEP" || (hp >= maxHp && status === "NONE")) return null;
  return {
    kind: "inflict",
    targetBattlerIndex: Number(battlerIndex),
    newStatus: "SLEEP",
    newStatusCount: 3,
    commitOnExecutedHit: true,
    requiresAccuracyHit: false,
  };
}
