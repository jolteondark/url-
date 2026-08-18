function fallbackSideName(side) {
  if (side === "player") return "味方のポケモン";
  if (side === "foe") return "相手のポケモン";
  return "ポケモン";
}

export function formatSafariBattlePresentationEvent(event = {}, context = {}) {
  // Normal-round events carry the pre-round identity snapshot. Prefer it over
  // live DOM/state because trainer replacement can already be committed before
  // the old foe's presentation queue is played.
  const actorName = event.actorSpecies || context.actorName || fallbackSideName(event.actor);
  const targetName = event.targetSpecies || context.targetName || fallbackSideName(event.target);

  switch (event.type) {
    case "move_started": {
      const moveName = context.moveName || event.moveId || "わざ";
      return `${actorName}の${moveName}！`;
    }
    case "damage_applied":
      return `${targetName}のHP ${Number(event.hpBefore ?? 0)} → ${Number(event.hpAfter ?? 0)}`;
    case "miss":
      return `${actorName}の攻撃は外れた！`;
    case "faint":
      return `${targetName}は倒れた！`;
    case "trainer_next":
      return `${event.trainer || "トレーナー"}は${event.species || "次のポケモン"}を繰り出した！`;
    case "capture":
      return event.result === "caught"
        ? `${event.targetSpecies || targetName}を捕まえた！`
        : `${event.targetSpecies || targetName}を捕まえられなかった！`;
    case "battle_result":
      return context.notice || null;
    default:
      return null;
  }
}
