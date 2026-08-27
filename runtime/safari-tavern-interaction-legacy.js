import { SAFARI_MOVE_MASTERS } from "./safari-playable-data.js";
import { pokemonMoveTotalPp, setPokemonRuntimeMovePp, updatePokemonRuntime } from "./pokemon-runtime.js";

export const MAPLESS_TAVERN_REST_COST_V108 = 600;
export const MAPLESS_TAVERN_LEAD_INFORMATION_COST_V108 = 1500;

export const MAPLESS_TAVERN_ORGS_V108 = Object.freeze({
  TEAM_ROCKET:{ name:"ロケット団", summary:"禁断研究に関する記録。出所を確かめる必要がある。" },
  TEAM_AQUA:{ name:"アクア団", summary:"海に関する計画の断片。まだ場所は特定できない。" },
  TEAM_MAGMA:{ name:"マグマ団", summary:"火山に関する計画の断片。まだ場所は特定できない。" },
  TEAM_GALACTIC:{ name:"ギンガ団", summary:"時空研究に関する記録。内容の裏付けが必要だ。" },
  TEAM_PLASMA:{ name:"プラズマ団", summary:"二重の目的を持つ命令書。情報源の確認が必要だ。" },
  TEAM_FLARE:{ name:"フレア団", summary:"大規模な装置に関する設計断片。場所は未確定だ。" },
  TEAM_SKULL:{ name:"スカル団", summary:"集会場所を示す地図。正確な位置はまだ分からない。" },
  AETHER_FOUNDATION:{ name:"エーテル財団", summary:"分類不明の保護記録。詳細の確認が必要だ。" },
  TEAM_YELL:{ name:"エール団", summary:"道の封鎖に関する予定表。場所はまだ曖昧だ。" },
  MACRO_COSMOS:{ name:"マクロコスモス", summary:"大規模エネルギー計画の資料。真偽の確認が必要だ。" },
  TEAM_STAR:{ name:"スター団", summary:"複数拠点に関する記録。正確な場所は未確認だ。" },
});

export const MAPLESS_TAVERN_RUMORS_V108 = Object.freeze([
  "増水した川のそばで、靴を片方だけ流された客がいたよ。もう片方は記念に飾ってる",
  "燃える荷車を見たって旅人が来た。酒より先に水を三杯も飲んでいったよ",
  "洞窟のキノコを料理してくれって？ うちは客席が回り始める料理は出さない主義だ",
  "地下の温泉を見つけた連中は、帰る頃には全員のぼせた顔をしてたな",
  "星の欠片を拾った客がいた。夜になると、袋の中だけ薄く光るんだとさ",
  "ハチミツの匂いをつけたまま来るなよ。前に店中をむしポケモンが飛び回ったんだ",
  "迷子のポケモンを連れた旅人がいた。どちらが迷子なのか、最後まで分からなかったよ",
  "通路を塞ぐほど大きなポケモンが寝てる？ そいつは客としても寝床を取りすぎるな",
  "巣から持ち帰った羽根を見せてもらった。親のほうが、ずっと近くから見ていたらしい",
  "きのみ泥棒を追いかけた客がいたよ。戻ってきた時には自分の夕飯までなくしてた",
  "写真家ってのは妙な連中だ。危ない瞬間ほど、目が輝いてやがる",
  "旅の料理人が置いていった鍋がある。何度洗っても、香辛料の匂いが取れなくてね",
  "大道芸人がこの店で芸をしたことがある。天井の傷は、その時の名残だ",
  "落とし物のバッグを届けた客がいた。持ち主より先に、中から鳴き声が返ってきたそうだ",
  "看護師の格好だけなら誰でもできる。だが手つきを見れば、長く旅した者には分かるらしい",
  "きのみジュース屋が新作を置いていった。色は見事だったが、味の感想は誰も言わなかった",
  "道具を集める老人がいるだろう。本人いわく、物には前の持ち主の癖が残るんだと",
  "願いの泉に酒を供えた奴がいた。翌朝、空の瓶だけきれいに並べられていたよ",
  "古い石像を見たという客は多い。だが皆、顔がどちらを向いていたかで話が違う",
  "臨時の競りは騒がしいから好きじゃない。静かな客ほど、とんでもない額を出すんだ",
  "トレーナーの野営地は遠くからでも分かる。鍋の匂いと、技の音が交互に聞こえるからな",
  "きのみ品評会の審査員が飲みに来た。一晩中、色と艶の話しかしてくれなかったよ",
  "壊れた研究所を漁る学者がいる。動かない機械にも、耳を当てて話しかけるんだ",
  "宝の地図を売る奴は毎年いる。不思議なことに、誰も同じ顔を覚えていない",
  "賞金首の手配書は壁に貼るなよ。以前、本人が自分の似顔絵を直しに来たことがある",
  "崩れかけた橋の向こうから、毎晩同じランタンがこちらを照らしているそうだ",
  "傷ついたポケモンを抱えて来た客がいた。自分の傷には気づかないまま、朝まで看病してたよ",
  "古い技術端末が急に動き出したって話か。機械にも、忘れたくない技があるのかもな",
  "血筋を見抜く老婆を知ってるよ。昔のことを、本人より先に思い出すような人だ",
  "旅を終えた武人は、剣を壁に掛けている。だが足音だけは、今も現役のままだそうだ",
  "宝箱を開ける音は遠くまで響く。中身より、その音を待っている奴もいるらしい",
  "罠にかかった客ほど、店では大きな声で笑う。怖かった話は、笑い話にしないと眠れないんだろう",
  "坑道帰りの鉱夫は、まず机を二度叩く。地面が動かないことを確かめる癖なんだとさ",
  "卵を抱えた旅人は酒を飲まない。代わりに、殻へ今日の出来事を話して聞かせる",
  "境界通信で別れたポケモンの話をする客もいる。向こう側でも元気だと、皆どこかで信じてる",
  "錬金術師の客が置いていった硬貨がある。朝には別の金属になっていた。価値は下がってたがね",
  "ポケモンセンターの灯りは遠くからでも見える。あれを見ただけで歩けるようになる夜もある",
  "民家に招かれた旅人は、皆少し長居する。闇の外にも暮らしがあると、思い出すんだろう",
  "悪党の隠れ家に迷い込んだ客がいた。店へ戻るなり、制服を見るのも嫌だと言ってたよ",
  "この村も昔は別の場所にあったらしい。まあ、ここじゃ昔と今の境目も曖昧だがね",
]);

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function randomInt(limit) {
  const max = Number(limit);
  if (!Number.isSafeInteger(max) || max <= 0) throw new RangeError("random limit must be positive");
  if (globalThis.crypto?.getRandomValues) {
    const span = 0x100000000;
    const threshold = span - (span % max);
    const word = new Uint32Array(1);
    do globalThis.crypto.getRandomValues(word); while (word[0] >= threshold);
    return word[0] % max;
  }
  return Math.floor(Math.random() * max);
}
function normalizeLeadState(state) {
  const phase = Number.isInteger(Number(state.active_lead_phase)) ? Math.trunc(Number(state.active_lead_phase)) : 0;
  const orgId = state.active_lead_id == null ? null : String(state.active_lead_id).toUpperCase();
  if (phase < 1 || phase > 2 || !MAPLESS_TAVERN_ORGS_V108[orgId]) {
    state.active_lead_id = null;
    state.active_lead_source_org = null;
    state.active_lead_phase = 0;
    state.active_lead_obtained_day = 0;
    state.active_lead_confirmed_day = 0;
    return;
  }
  state.active_lead_id = orgId;
  const source = state.active_lead_source_org == null ? orgId : String(state.active_lead_source_org).toUpperCase();
  state.active_lead_source_org = MAPLESS_TAVERN_ORGS_V108[source] ? source : orgId;
  state.active_lead_phase = phase;
  state.active_lead_obtained_day = Math.max(0, Math.trunc(Number(state.active_lead_obtained_day ?? 0)));
  state.active_lead_confirmed_day = phase === 2 ? Math.max(1, Math.trunc(Number(state.active_lead_confirmed_day ?? 1))) : 0;
}
function clearLead(state) {
  state.active_lead_id = null;
  state.active_lead_source_org = null;
  state.active_lead_phase = 0;
  state.active_lead_obtained_day = 0;
  state.active_lead_confirmed_day = 0;
}
function isEgg(pokemon) { return Number(pokemon?.steps_to_hatch ?? 0) > 0; }
function moveId(move) { return typeof move === "string" ? move : move?.id; }
function partialHealParty(runtime) {
  let healed = false;
  runtime.player.party = (runtime.player?.party ?? []).map((pokemon) => {
    if (!pokemon || isEgg(pokemon)) return pokemon;
    let next = pokemon;
    const maxHp = Math.max(1, Number(pokemon.max_hp ?? pokemon.totalhp ?? pokemon.hp ?? 1));
    const hp = Number(pokemon.hp ?? 0);
    if (hp > 0 && hp < maxHp) {
      next = updatePokemonRuntime(next, { hp:Math.min(maxHp, hp + Math.max(1, Math.floor(maxHp / 4))) });
      healed = true;
    }
    if (next.status && next.status !== "NONE") {
      next = updatePokemonRuntime(next, { status:"NONE", status_count:0 });
      healed = true;
    }
    for (let index = 0; index < (next.moves?.length ?? 0); index += 1) {
      const move = next.moves[index];
      const master = SAFARI_MOVE_MASTERS[moveId(move)];
      if (!master || !Number.isInteger(master.total_pp)) continue;
      const ppup = typeof move === "string" ? 0 : Number(move.ppup ?? 0);
      const totalPp = pokemonMoveTotalPp(master.total_pp, Number.isInteger(ppup) && ppup >= 0 ? ppup : 0);
      const pp = typeof move === "string" ? totalPp : Number(move.pp ?? totalPp);
      if (pp >= totalPp) continue;
      next = setPokemonRuntimeMovePp(next, index, Math.min(totalPp, pp + Math.max(1, Math.floor(totalPp / 5))), master.total_pp);
      healed = true;
    }
    return next;
  });
  return healed;
}
function trackingActions(runtime) {
  const state = stateOf(runtime);
  normalizeLeadState(state);
  if (state.active_lead_phase === 0) return [{ id:"tracking:back", label:"戻る", secondary:true }];
  if (state.active_lead_phase === 1) return [
    { id:"tracking:buy", label:"情報を買う", meta:"1500円", disabled:Number(runtime.bag?.money ?? 0) < MAPLESS_TAVERN_LEAD_INFORMATION_COST_V108 },
    { id:"tracking:summary", label:"概要を見る" },
    { id:"tracking:abandon", label:"放棄する" },
    { id:"tracking:back", label:"戻る", secondary:true },
  ];
  return [
    { id:"tracking:summary", label:"概要を見る" },
    { id:"tracking:abandon", label:"放棄する" },
    { id:"tracking:back", label:"戻る", secondary:true },
  ];
}
function refreshTavernUi(runtime, index, menu = "main") {
  if (typeof globalThis.document === "undefined") return;
  const state = stateOf(runtime);
  const event = state.board_events[index];
  normalizeLeadState(state);
  const org = MAPLESS_TAVERN_ORGS_V108[state.active_lead_id];
  const trackingMeta = state.active_lead_phase === 0 ? "追跡なし" : `${org.name} / ${state.active_lead_phase === 1 ? "未確認" : "確認済み"}`;
  globalThis.__maplessNormalEventUi = {
    runtime, boardIndex:index, eventId:"tavern", title:"酒場", menu,
    message:state.notice ?? "酒場のマスターが、静かにグラスを磨いている。",
    actions:menu === "tracking" ? trackingActions(runtime) : [
      { id:"rest", label:"休憩する", meta:event.tavern_rest_used ? "本日は利用済み" : "600円", disabled:Boolean(event.tavern_rest_used) || Number(runtime.bag?.money ?? 0) < MAPLESS_TAVERN_REST_COST_V108 },
      { id:"gossip", label:"マスターと雑談" },
      { id:"tracking", label:"追跡情報", meta:trackingMeta },
      { id:"leave", label:"立ち去る", secondary:true },
    ],
  };
}

export function openSafariTavernTouch(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "tavern") throw new Error("tavern board event is required");
  event.tavern_rest_used = Boolean(event.tavern_rest_used);
  if (!Number.isInteger(Number(event.tavern_rumor_id))) event.tavern_rumor_id = 0;
  normalizeLeadState(state);
  state.board_revealed[index] = true;
  state.board_visited[index] = true;
  state.notice = "酒場のマスターが、静かにグラスを磨いている。";
  refreshTavernUi(runtime, index, "main");
  return { runtime, result:"tavern_ready", boundary:"tavern", availableActions:["rest","gossip","tracking","leave"], completed:false, consumed:false, operations:[] };
}

export function resolveSafariTavernAction(runtime, index, action, { randomInt: injectedRandomInt = randomInt } = {}) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || event.kind !== "tavern") throw new Error("tavern board event is required");
  normalizeLeadState(state);
  state.board_revealed[index] = true;
  state.board_visited[index] = true;

  if (action === "leave") {
    state.notice = "酒場から戻りました。";
    return { runtime, result:"left", completed:true, consumed:false, operations:[] };
  }
  if (action === "rest") {
    if (event.tavern_rest_used) {
      state.notice = "この酒場では、今日はもう休めません。";
      refreshTavernUi(runtime, index);
      return { runtime, result:"already_rested", completed:false, consumed:false, operations:[] };
    }
    if (Number(runtime.bag?.money ?? 0) < MAPLESS_TAVERN_REST_COST_V108) {
      state.notice = "休憩には600円必要です。";
      refreshTavernUi(runtime, index);
      return { runtime, result:"insufficient_money", completed:false, consumed:false, operations:[] };
    }
    runtime.bag.money = Number(runtime.bag.money ?? 0) - MAPLESS_TAVERN_REST_COST_V108;
    const healed = partialHealParty(runtime);
    event.tavern_rest_used = true;
    state.notice = "静かな席で身体を休め、手持ちのHPとPPが少し回復しました。";
    const operations = [{ op:"tavern_rest", cost:MAPLESS_TAVERN_REST_COST_V108, healed }, { op:"request_save", reason:"tavern_rest" }];
    state.last_operations = operations;
    refreshTavernUi(runtime, index);
    return { runtime, result:"rested", completed:false, consumed:false, healed, persistenceRequested:true, operations };
  }
  if (action === "gossip") {
    const indexRoll = Number(injectedRandomInt(MAPLESS_TAVERN_RUMORS_V108.length));
    const rumorIndex = Math.max(0, Math.min(MAPLESS_TAVERN_RUMORS_V108.length - 1, indexRoll));
    state.notice = `マスターはグラスを磨く手を止めず、店で耳にした話をぽつりと語り始めた。「${MAPLESS_TAVERN_RUMORS_V108[rumorIndex]}」`;
    refreshTavernUi(runtime, index);
    return { runtime, result:"gossip", rumorIndex, completed:false, consumed:false, operations:[] };
  }
  if (action === "tracking") {
    if (state.active_lead_phase === 0) state.notice = "追っている情報はありません。";
    else {
      const org = MAPLESS_TAVERN_ORGS_V108[state.active_lead_id];
      state.notice = state.active_lead_phase === 1
        ? `追跡中の情報：${org.name}　確認料：1500円`
        : `確認済みの追跡情報：${org.name}`;
    }
    refreshTavernUi(runtime, index, "tracking");
    return { runtime, result:"tracking_menu", completed:false, consumed:false, operations:[] };
  }
  if (action === "tracking:back") {
    state.notice = "酒場のマスターが、静かにグラスを磨いている。";
    refreshTavernUi(runtime, index, "main");
    return { runtime, result:"tracking_back", completed:false, consumed:false, operations:[] };
  }
  if (action === "tracking:summary") {
    const org = MAPLESS_TAVERN_ORGS_V108[state.active_lead_id];
    state.notice = org ? org.summary : "追っている情報はありません。";
    refreshTavernUi(runtime, index, "tracking");
    return { runtime, result:"tracking_summary", completed:false, consumed:false, operations:[] };
  }
  if (action === "tracking:buy") {
    if (state.active_lead_phase !== 1) {
      state.notice = "確認できる未確定情報はありません。";
      refreshTavernUi(runtime, index, "tracking");
      return { runtime, result:"no_candidate", completed:false, consumed:false, operations:[] };
    }
    if (Number(runtime.bag?.money ?? 0) < MAPLESS_TAVERN_LEAD_INFORMATION_COST_V108) {
      state.notice = "所持金が足りません。";
      refreshTavernUi(runtime, index, "tracking");
      return { runtime, result:"insufficient_money", completed:false, consumed:false, operations:[] };
    }
    runtime.bag.money = Number(runtime.bag.money ?? 0) - MAPLESS_TAVERN_LEAD_INFORMATION_COST_V108;
    state.active_lead_phase = 2;
    state.active_lead_confirmed_day = Math.max(1, Math.trunc(Number(state.day ?? 1)));
    state.notice = "複数の証言が一致し、情報の裏付けが取れました。追跡情報を確認済みにしました。";
    const operations = [{ op:"tavern_confirm_lead", cost:MAPLESS_TAVERN_LEAD_INFORMATION_COST_V108, orgId:state.active_lead_id }, { op:"request_save", reason:"tavern_confirm_lead" }];
    state.last_operations = operations;
    refreshTavernUi(runtime, index, "tracking");
    return { runtime, result:"lead_confirmed", completed:false, consumed:false, persistenceRequested:true, operations };
  }
  if (action === "tracking:abandon") {
    const oldOrg = state.active_lead_id;
    clearLead(state);
    state.notice = "集めていた手掛かりを破棄し、現在の追跡を終了しました。";
    const operations = [{ op:"tavern_abandon_lead", orgId:oldOrg }, { op:"request_save", reason:"tavern_abandon_lead" }];
    state.last_operations = operations;
    refreshTavernUi(runtime, index, "tracking");
    return { runtime, result:"lead_abandoned", completed:false, consumed:false, persistenceRequested:true, operations };
  }
  throw new RangeError("unsupported tavern action");
}
