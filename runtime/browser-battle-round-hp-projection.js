function resolvedHpFromOperations(operations, target) {
  let hp = null;
  for (const operation of operations ?? []) {
    if (operation?.target !== target) continue;
    if ((operation.op === "reduce_hp" || operation.op === "reduce_self_hp") && Number.isFinite(Number(operation.hpAfter))) {
      hp = Math.max(0, Math.trunc(Number(operation.hpAfter)));
      continue;
    }
    if (operation.op === "faint" || operation.op === "faint_self") hp = 0;
  }
  return hp;
}

export function projectBrowserBattleResolvedHp(pokemon, operations, target) {
  if (!pokemon || typeof pokemon !== "object" || Array.isArray(pokemon)) return pokemon;
  const hp = resolvedHpFromOperations(operations, target);
  if (hp === null) return pokemon;
  const maxHp = Number(pokemon.max_hp);
  const clamped = Number.isFinite(maxHp) && maxHp >= 0 ? Math.min(maxHp, hp) : hp;
  return { ...pokemon, hp: clamped };
}
