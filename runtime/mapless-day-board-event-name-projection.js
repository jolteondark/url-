export function projectDayBoardEventName(event, typeNames = {}) {
  if (event == null) return '不明なイベント';
  switch (event.kind) {
    case 'wild': {
      const typeId = String(event.type);
      const typeName = Object.prototype.hasOwnProperty.call(typeNames, typeId) ? typeNames[typeId] : typeId;
      return `${typeName}タイプの野生`;
    }
    case 'trainer': return 'トレーナー戦';
    case 'center': return 'ポケモンセンター';
    case 'shop': return 'フレンドリィショップ';
    case 'egg_shop': return '卵屋';
    case 'miner': return '炭鉱夫';
    case 'delta_exchange': return 'デルタ交換所';
    case 'type_event': return 'タイプイベント';
    case 'house': return '民家';
    case 'tavern': return '酒場';
    case 'normal_event': return '暗闇で出会った一回限りの出来事';
    case 'treasure': return '宝箱';
    case 'trap': return '罠の気配';
    case 'buried_item': return '落とし物';
    case 'next_day': return '野宿する';
    default: throw new RangeError('event kind is outside the v0.9.108 board contract');
  }
}
