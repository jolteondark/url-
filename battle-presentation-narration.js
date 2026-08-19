function fallbackSideName(side) {
  if (side === "player") return "味方のポケモン";
  if (side === "foe") return "相手のポケモン";
  return "ポケモン";
}

const STAT_STAGE_NAMES = Object.freeze({
  ATTACK: "こうげき",
  DEFENSE: "ぼうぎょ",
  SPECIAL_ATTACK: "とくこう",
  SPECIAL_DEFENSE: "とくぼう",
  SPEED: "すばやさ",
  ACCURACY: "命中率",
  EVASION: "回避率",
});

function publishPresentationEvent(event) {
  if (!event || typeof globalThis.window?.dispatchEvent !== "function" || typeof globalThis.CustomEvent !== "function") return;
  globalThis.window.dispatchEvent(new globalThis.CustomEvent("safari-battle-presentation-event", {
    detail: { event },
  }));
}

export function formatSafariBattlePresentationEvent(event = {}, context = {}) {
  // The mechanics owner has already ordered and truncated this queue. Publish
  // only the event being rendered so phase/UI code can follow that owner order
  // without re-deciding priority, speed, KO, reserve, or opponent response.
  publishPresentationEvent(event);

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
    case "action_blocked":
      if (event.reason === "sleep") return `${actorName}はぐうぐう眠っている…`;
      if (event.reason === "frozen") return `${actorName}は凍っていて動けない！`;
      if (event.reason === "paralysis") return `${actorName}は体がしびれて動けない！`;
      if (event.reason === "flinch") return `${actorName}はひるんで技が出せない！`;
      return `${actorName}は技を出せない！`;
    case "status_recovered":
      if (event.status === "SLEEP") return `${actorName}は目を覚ました！`;
      if (event.status === "FROZEN") return `${actorName}のこおりが溶けた！`;
      return null;
    case "confusion_active":
      return `${actorName}はこんらんしている！`;
    case "confusion_cured":
      return `${actorName}のこんらんが解けた！`;
    case "confusion_self_hit":
      return `${actorName}はわけもわからず自分を攻撃した！`;
    case "stat_stage_changed": {
      const statName = STAT_STAGE_NAMES[event.stat] || event.stat || "能力";
      const delta = Number(event.appliedDelta ?? 0);
      if (delta === 0) return `${actorName}の${statName}はこれ以上変わらない！`;
      return `${actorName}の${statName}が${Math.abs(delta)}段階${delta > 0 ? "上がった" : "下がった"}！`;
    }
    case "damage_applied":
      return `${targetName}のHP ${Number(event.hpBefore ?? 0)} → ${Number(event.hpAfter ?? 0)}`;
    case "battle_item":
      return `${actorName}は${event.itemId === "POTION" ? "キズぐすり" : (event.itemId || "アイテム")}を使った！ HP ${Number(event.hpBefore ?? 0)} → ${Number(event.hpAfter ?? 0)}`;
    case "miss":
      return `${actorName}の攻撃は外れた！`;
    case "faint":
      return `${targetName}は倒れた！`;
    case "exp_gain":
      return `${actorName}は ${Number(event.amount ?? 0)} EXP を得た！`;
    case "level_up":
      return `${actorName}は Lv.${Number(event.level ?? 0)} になった！`;
    case "move_learned": {
      const moveName = context.moveName || event.moveId || "新しい技";
      return `${actorName}は${moveName}を覚えた！`;
    }
    case "move_replaced": {
      const moveName = context.moveName || event.moveId || "新しい技";
      const forgotten = event.forgottenMoveId || "以前の技";
      return `${actorName}は${forgotten}を忘れて${moveName}を覚えた！`;
    }
    case "move_declined": {
      const moveName = context.moveName || event.moveId || "新しい技";
      return `${actorName}は${moveName}を覚えなかった。`;
    }
    case "evolution":
      return `${event.from || actorName}は${event.to || "新しい姿"}に進化した！`;
    case "item_reward":
      return `${event.item || "アイテム"} ×${Number(event.quantity ?? 1)}を手に入れた！`;
    case "money_reward":
      return `${Number(event.amount ?? 0)}円を手に入れた！`;
    case "trainer_next":
      return `${event.trainer || "トレーナー"}は${event.species || "次のポケモン"}を繰り出した！`;
    case "capture":
      return event.result === "caught"
        ? `${event.targetSpecies || targetName}を捕まえた！`
        : `${event.targetSpecies || targetName}を捕まえられなかった！`;
    case "flee":
      if (event.result === "escaped") return "うまく逃げ切った！";
      if (event.result === "blocked") return "この戦闘からは逃げられない！";
      return "逃げられなかった！";
    case "battle_result": {
      if (Number(event.decision) !== 1) return context.notice || null;
      const parts = ["勝利！"];
      const exp = Number(event.expGained ?? 0);
      if (exp > 0) parts.push(`${exp} EXP`);
      if (event.reward?.item) parts.push(`${event.reward.item} ×${Number(event.reward.quantity ?? 1)}`);
      const money = Number(event.moneyGained ?? 0);
      if (money > 0) parts.push(`${money}円`);
      const destination = event.returnTarget === "home" ? "ホーム" : event.returnTarget === "village" ? "村" : "Day Board";
      parts.push(`Returnで${destination}へ`);
      return parts.join(" / ");
    }
    default:
      return null;
  }
}
