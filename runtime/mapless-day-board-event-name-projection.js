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
    case 'next_day': return '野宿する';
    default: throw new RangeError('event kind is outside the retained M0037 contract');
  }
}
