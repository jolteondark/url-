import { resolveBattleStatStageAbilityChangeCanonical } from "./battle-core-stat-stage-ability-extension.js";
import { applyBattleStatStageChangesCanonical } from "./battle-core-stat-stages.js";

function sourceKindCanonical(sourceKindBySubject, subject) {
  const sourceKind = sourceKindBySubject?.[subject];
  return sourceKind ?? "other";
}

function pokemonForSubjectCanonical(subject, userPokemon, targetPokemon) {
  return subject === "user" ? (userPokemon ?? {}) : (targetPokemon ?? {});
}

export function applyBattleStatStageChangesWithAbilitiesCanonical(
  state,
  changes,
  userBattlerIndex,
  targetBattlerIndex,
  {
    userPokemon = {},
    targetPokemon = {},
    sourceKindBySubject = {},
    moldBreaker = false,
  } = {},
) {
  const transformed = [];
  const abilityModifiers = [];
  for (const change of changes ?? []) {
    const subject = change?.subject === "user" ? "user" : "target";
    const modifier = resolveBattleStatStageAbilityChangeCanonical({
      pokemon: pokemonForSubjectCanonical(subject, userPokemon, targetPokemon),
      change,
      sourceKind: sourceKindCanonical(sourceKindBySubject, subject),
      moldBreaker,
    });
    transformed.push(modifier.change);
    abilityModifiers.push(Object.freeze({
      subject,
      source: modifier.source,
      modified: modifier.modified,
      abilityIgnored: modifier.abilityIgnored,
      originalDelta: Number(change?.delta ?? 0),
      resolvedDelta: Number(modifier.change?.delta ?? 0),
    }));
  }

  const resolution = applyBattleStatStageChangesCanonical(
    state,
    transformed,
    userBattlerIndex,
    targetBattlerIndex,
  );
  return {
    ...resolution,
    abilityModifiers: Object.freeze(abilityModifiers),
  };
}
