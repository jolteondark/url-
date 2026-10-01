export function p1PresentationMessage(event) {
  if (!event?.type) return '';
  switch (event.type) {
    case 'BOARD_READY': return `Day ${Number(event.day)}`;
    case 'BATTLE_STARTED': return '戦闘開始！';
    case 'POKEMON_SENT_OUT': return event.species ? `${event.species} が戦闘に出た！` : '';
    case 'MOVE_USED': return event.moveId ? `${event.side === 'player' ? '味方' : '相手'}の ${event.moveId}！` : '';
    case 'MOVE_MISSED': return 'しかし攻撃は外れた！';
    case 'DAMAGE_APPLIED': return event.side === 'player' ? `${Number(event.amount)} ダメージを受けた！` : `${Number(event.amount)} ダメージを与えた！`;
    case 'STATUS_APPLIED': return `${event.side === 'player' ? '味方' : '相手'}は ${event.status} 状態になった！`;
    case 'ABILITY_TRIGGERED': return event.abilityId ? `特性 ${event.abilityId} が発動！` : '特性が発動！';
    case 'ITEM_TRIGGERED': return event.itemId ? `${event.itemId} が発動！` : '道具が発動！';
    case 'POKEMON_FAINTED': return event.side === 'player' ? '味方ポケモンは倒れた！' : '相手ポケモンを倒した！';
    case 'BATTLE_WON': return '戦闘に勝利した！';
    case 'BATTLE_LOST': return '戦闘に敗北した……';
    case 'EXP_GAINED': return `${Number(event.amount)} EXPを獲得！`;
    case 'ITEM_REWARDED': return `${event.itemId} ×${Number(event.quantity)} を獲得！`;
    case 'LEVEL_UP': return event.level ? `Lv.${Number(event.level)} に上がった！` : 'レベルが上がった！';
    case 'DAY_ADVANCED': return `Day ${Number(event.day)} へ進んだ。`;
    default: return '';
  }
}
