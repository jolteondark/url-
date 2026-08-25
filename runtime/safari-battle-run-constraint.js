function battleOf(runtime) {
  const battle = runtime?.variables?.mapless?.battle;
  if (!battle || typeof battle !== "object" || Array.isArray(battle)) throw new Error("active Safari battle is required");
  return battle;
}

export function applySafariBattleRunConstraint(runtime, cannotRun) {
  const battle = battleOf(runtime);
  battle.cannot_run = cannotRun === true;
  return battle.cannot_run;
}

export function safariBattleCanRun(runtime) {
  const battle = battleOf(runtime);
  if (battle.kind !== "wild") return false;
  if (battle.origin === "village_bounty") return false;
  return battle.cannot_run !== true;
}
