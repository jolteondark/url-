export function shouldFreezeCanonicalBattleSprite(card) {
  return Boolean(card && !card.hidden && card.dataset?.turnPhase === "resolving");
}
