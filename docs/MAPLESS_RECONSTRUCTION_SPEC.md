# Mapless Web Reconstruction Specification

Status: **authoritative development direction**  
Effective date: 2026-09-15  
Target repository: `jolteondark/url-`  
Target runtime: Safari/Web, especially iPad/iPhone Safari  
Canonical Mapless game-design source: **Mapless v0.9.108 / canonical source and extracted data**  
Pokémon battle-mechanics reference: **Pokémon Showdown**  
PokéRogue: **reference only; do not use as canonical battle semantics**

---

## 0. Executive decision

Mapless Web は、現在のWeb実装を継ぎ足して完成させる方針から、**ゲーム仕様・データ・アセット・テスト資産を維持しつつ、Web実装の中核を新規に再構成する方針**へ移行する。

全面的に旧資産を捨てるリライトではない。以下を区別する。

### 捨ててもよいもの

- 現行Webの場当たり的なbattle orchestration
- Safari側に増えた重複owner / bridge / patch
- 旧ツクール構造をWeb側で模倣するためだけのコード
- 画面固有のmechanics再実装
- 重さの原因になる再描画・DOM更新・重複状態管理
- 今後の新アーキテクチャと矛盾する互換glue

### 必ず残すもの

- Mapless v0.9.108 のゲームデザイン
- 日数、8マス探索、村3行動、イベント、施設、報酬、ラン終了条件などの仕様
- species / moves / items / encounters / events / progression等のcanonical data
- 既存アセット
- 既存のdeterministic RNG・replay・smoke/regression testで再利用できる知見
- 現行Web版で既に確認された正しい挙動
- 旧ツクール版と旧Web版をbehavior oracleとして比較できる状態

原則は以下。

> **旧Maplessは実装元ではなく、ゲームデザインと挙動のoracleである。**  
> **Pokémon ShowdownはPokémon battle mechanicsのoracle / engine sourceである。**  
> **新Mapless WebはWeb向けに再構成する。**

---

# 1. Source of truth hierarchy

仕様衝突時の優先順位を固定する。

## 1.1 Mapless固有仕様

1. Mapless v0.9.108 canonical behavior/data
2. v0.9.108に基づく検証済みtest / extracted spec
3. 旧Web版のうちcanonicalと一致する挙動
4. それ以外の旧実装

Mapless固有仕様には以下を含む。

- 8択Day Board
- day / floor / boundary progression
- 村3行動
- イベント出現条件・選択肢・報酬
- wild / trainer encounter生成規則
- 持ち込み・ラン終了・carryover
- Mapless独自の進化条件
- EXP倍率、報酬、ショップ、施設
- 捕獲後のParty / Storage処理
- Mapless独自AIや難易度調整

## 1.2 Pokémon battle mechanics

Pokémonの一般戦闘仕様は**Pokémon Showdown**を第一基準とする。

対象例:

- move order
- priority
- speed comparison
- accuracy/evasion
- damage formula components
- critical hit
- STAB
- type effectiveness / immunity
- status
- stat stages
- abilities
- held items
- weather
- terrain
- volatile conditions
- multi-hit
- recoil / drain
- protect-family
- trapping
- switching interaction
- charge / recharge
- secondary effects
- turn-end residual processing
- faint ordering

ただしShowdownはMaplessそのものではないので、Mapless固有仕様が明示的に変更している部分はMaplessを優先する。

## 1.3 PokéRogueの位置付け

PokéRogueは以下にのみ利用可能。

- Webゲームとしてのrendering / loading / asset managementの参考
- Pokémon roguelike UI/UXの比較
- performance architectureの参考
- Showdown / 原作との差異を調べる補助資料

**PokéRogue固有のbattle balance / mechanics / exceptionをMaplessのcanonicalとして採用しない。**

---

# 2. Reconstruction strategy

## 2.1 結論

新しい実装は既存コードベースの中に**New Core**として横に作る。

旧コードは当面削除しない。

```text
legacy web implementation   <- reference / regression oracle
canonical Mapless v0.9.108 <- design oracle
Pokémon Showdown            <- battle-mechanics oracle
             |
             v
      NEW MAPLESS CORE
             |
      presentation/events
             |
        Safari/Web UI
```

## 2.2 新旧混在の原則

- 新規仕様は原則New Coreにのみ追加する。
- Legacy側へ新しいmechanicsを追加しない。
- Legacy側の修正は「新Coreへの移行を可能にするbridge」「重大なpublic breakの応急処置」に限定する。
- 新Coreで一つのvertical sliceが成立したら、同機能のlegacy ownerを段階的にinactive化する。
- 同じmechanicのtruthを2個作らない。

---

# 3. Target architecture

```text
Mapless Application
|
+-- Mapless Core (pure/domain)
|   +-- Run State
|   +-- Day / Floor Progression
|   +-- Board Generator
|   +-- Exploration
|   +-- Village
|   +-- Event Engine
|   +-- Encounter Generator
|   +-- Party / Storage
|   +-- Bag / Economy
|   +-- Growth / EXP / Evolution
|   +-- Persistence Projection
|   +-- RNG
|
+-- Battle Adapter
|   +-- Showdown Bridge
|   +-- Persistent HP/PP sync
|   +-- Wild/Trainer command policy
|   +-- Capture
|   +-- Run/Flee
|   +-- Battle-item actions
|   +-- Reward handoff
|
+-- Presentation
|   +-- Scene Model
|   +-- Animation Queue
|   +-- Message Queue
|   +-- Pixel Art Resolver
|   +-- DP/PT-style layout
|
+-- Platform
    +-- Safari Input
    +-- Audio
    +-- Save Storage
    +-- Asset Loader
    +-- Diagnostics / Profiler
```

---

# 4. Core API contract

CoreはDOM・Canvas・CSS・audio・timerに依存しない。

基本形:

```ts
result = step(state, command)
```

返り値:

```ts
{
  state: NewGameState,
  events: DomainEvent[],
  effects?: RequestedSideEffect[]
}
```

例:

```ts
step(state, { type: 'BOARD_SELECT', slot: 5 })
```

結果例:

```ts
{
  state,
  events: [
    { type: 'BOARD_SLOT_CONSUMED', slot: 5 },
    { type: 'ENCOUNTER_STARTED', encounterId: '...' },
    { type: 'BATTLE_REQUESTED', battleId: '...' }
  ]
}
```

Presentationはeventsを見て描写するだけで、mechanicsを書き換えない。

---

# 5. Canonical GameState

最低限以下を一つのserializable stateとして持つ。

```ts
GameState = {
  schemaVersion,
  runId,
  seed,
  rngState,

  day,
  floor,
  boundaryState,

  board,
  boardSelectionsRemaining,

  location,
  mode,

  party,
  storage,
  bag,
  money,

  progressionFlags,
  eventFlags,
  facilityState,
  villageActionsRemaining,

  activeEncounter,
  activeBattle,

  carryover,
  runStatus,

  diagnostics
}
```

禁止:

- UI component内にcanonical HPを持つ
- Battle moduleとParty moduleが別々のPP truthを持つ
- Save用objectとruntime objectが独立進化する
- DOM datasetをgame stateとして使う

---

# 6. RNG contract

## 6.1 原則

すべてのゲーム結果に関わる乱数はseeded RNGを通す。

対象:

- board generation
- encounter selection
- trainer generation
- reward roll
- battle random rolls
- capture roll
- secondary effects
- AI tie-break

## 6.2 Presentation RNG

visual-only RNGは別streamにする。

例:

- particle位置
- sprite jitter
- decorative animation variation

Presentation RNGがgameplay RNG stateを消費してはいけない。

## 6.3 Replay

`initial state + ordered commands` から同じdomain stateが再現できること。

Performance animation timingはreplay determinismに含めない。

---

# 7. Mapless game-loop specification

## 7.1 Start / Continue

Start:

1. new run state生成
2. carryover適用
3. canonical initial party/item/state適用
4. Day Boardへ

Continue:

1. schema validation
2. migration
3. state restore
4. active transitionの整合性確認
5. presentation再構築

UI snapshotを保存しない。domain stateから画面を再構成する。

## 7.2 Day Board

- 1日の探索候補をcanonical規則で生成
- 原則8択
- slotはdomain identifierを持つ
- 表示テキスト・画像はpresentation projection
- slot消費はexactly once
- navigationだけでslotを消費しない
- battle/event completion後に正しいBoardへ戻る

## 7.3 Day progression

日送りは一つのownerのみ。

```text
Board actions consumed
 -> day end hooks
 -> boundary check
 -> next day setup
 -> board generation
```

二重day increment禁止。

## 7.4 Boundary

10n等のcanonical boundary ruleをMapless側が所有する。

Showdownはboundary progressionを知らない。

## 7.5 Village

canonical village entry時:

```text
villageActionsRemaining = 3
```

各施設action成功時に原則1消費。

0になったらcanonical exit/day progressionへ。

施設画面を開いただけでは消費しない。

## 7.6 Events

Eventは以下の形へ正規化する。

```ts
EventDefinition = {
  id,
  eligibility(state),
  weight,
  intro,
  choices,
  resolver(choice, state, rng)
}
```

resolverが返すのはdomain mutation/eventsのみ。

表示用HTMLをevent mechanicsに埋め込まない。

---

# 8. Battle architecture — critical decision

## 8.1 Showdownを何に使うか

ShowdownをPokémon battle mechanics layerとして利用する。

理想形は、**Mapless側でPokémonの技・特性・持ち物の相互作用を再発明しないこと**。

ShowdownのMITライセンス要件に従い、直接利用・必要部分のvendor・adapter化を選択可能とする。採用するShowdown revision/commitをpinし、license noticeを保持する。

## 8.2 Showdownに任せる領域

可能な限り以下をShowdownへ寄せる。

- turn/action order
- move execution
- accuracy
- damage
- critical
- type
- STAB
- stat stages
- status / volatile
- ability hooks
- held-item battle hooks
- weather / terrain
- residual processing
- switch mechanics
- faint event ordering
- move secondary effects

## 8.3 Mapless側に残す領域

Showdownに無理に押し込まない。

- encounter generation
- wild/trainer distinction
- Mapless trainer AI policy
- wild AI policy
- capture command and capture formula if Mapless canonical differs
- run/flee policy
- battle-use Bag UI and inventory ownership
- persistent consumable removal
- EXP
- level up
- move learning outside Showdown turn logic
- evolution
- money/reward
- bounty/reward
- Storage
- post-battle progression
- run end
- Save/Continue
- Mapless独自のbattle rule override

## 8.4 Persistent HP / PP synchronization

これは最重要境界。

Battle開始時:

```text
Mapless Party state
 -> Showdown battle projection
```

Battle終了時:

```text
Showdown resolved state
 -> Mapless Party state commit exactly once
```

同期対象:

- current HP
- status
- PP
- relevant persistent form/state
- held item consumption

同期しない一時状態:

- volatile status
- temporary stat stages
- temporary battle flags

Battleの途中でMapless PartyとShowdown stateを双方自由にmutateしない。

## 8.5 Command adapter

Mapless command:

```text
FIGHT(move)
POKEMON(switch target)
BAG(item,target)
RUN
CAPTURE(ball)
```

Showdown-native actionへ変換できるものは変換。

Showdown外actionはBattle Adapterがturn consumption ruleを管理し、その後Showdown側へ適切なopponent action / turn progressionを渡す。

## 8.6 Capture

CaptureはMapless owner。

成功:

1. capture result確定
2. Showdown battleをterminalへ
3. captured PokémonをMapless runtime entityへproject
4. Party空き -> Party
5. full Party -> Storage
6. item消費exactly once
7. persistence request

失敗:

- ball消費exactly once
- canonical ruleなら相手actionが進む
- battle継続

## 8.7 Flee

FleeもMapless policy owner。

成功/失敗によるturn consumptionをcanonicalに合わせる。

## 8.8 Trainer replacement

trainer reserve faint後:

- replacement selection
- new foe switch-in
- same-round attack禁止がMapless canonicalならadapterで保証
- 次COMMANDへ

## 8.9 Battle lifecycle

外側のstate machineはMaplessが所有する。

```text
BATTLE_INIT
 -> COMMAND
 -> RESOLVING
 -> PRESENTING
 -> COMMAND
 ...
 -> TERMINAL
 -> GROWTH_REWARD
 -> RESULT
 -> RETURN
```

Showdown内部のevent queueをそのままUI phaseとして露出しない。

---

# 9. Presentation specification

## 9.1 原則

**mechanicsはShowdown / Mapless Core、描写はMapless Presentation。**

PokéRogueの見た目をコピーするのではなく、Maplessの既存方針に沿うドット絵・DP/PT風UIを使う。

## 9.2 Presentation event queue

Battle Adapter / Coreから以下のようなsemantic eventを受け取る。

```text
BATTLE_STARTED
POKEMON_SENT_OUT
MOVE_USED
MOVE_MISSED
DAMAGE_APPLIED
SUPER_EFFECTIVE
NOT_VERY_EFFECTIVE
STATUS_APPLIED
ABILITY_TRIGGERED
ITEM_TRIGGERED
POKEMON_FAINTED
POKEMON_CAPTURED
EXP_GAINED
LEVEL_UP
BATTLE_WON
BATTLE_LOST
```

Presentationはイベントを順にアニメーションする。

**animation完了をmechanicsのtruthにしない。**

## 9.3 Dot-art renderer

- sprite-based
- CSSはlayout主体
- blur / large shadow / filterの常用を避ける
- battle sceneはDOM node大量生成を避ける
- pixel scalingは整数倍率を優先
- image smoothingを無効にできるrendererを優先
- visual stateはdomain stateからprojectionする

## 9.4 Message flow

メッセージ表示中にmechanicsを再計算しない。

mechanics result -> event queue -> message/animation consumption

とする。

---

# 10. Performance requirements

「機能量が少ないのに重い」を許容しない。

## 10.1 Target device

第一性能基準:

- iPad Safari portrait/landscape
- iPhone Safari

Desktop ChromiumだけをPASS条件にしない。

## 10.2 First playable performance gate

以下のvertical slice完成時点で性能評価を行う。

```text
Start
 -> Board
 -> select wild battle
 -> Battle
 -> command
 -> KO
 -> reward
 -> Board return
 -> next day
 -> Save
 -> fresh Continue
```

この時点で重ければ先へ機能追加せず原因を直す。

## 10.3 Metrics

最低限記録:

- frame time
- FPS
- long task
- scripting time
- style/layout time
- paint/composite time
- memory trend
- DOM node count
- active timers
- requestAnimationFrame count
- major rerender count
- asset decode/load spikes

## 10.4 Budget principle

60fps target時は16.7ms/frameを意識する。

常時60fpsが不要な画面ではevent-driven renderを優先し、無意味な60Hz更新をしない。

## 10.5 Prohibited patterns

- 複数独立requestAnimationFrame loop
- gameplay state polling every frame
- 全UI毎frame再構築
- 高DPI巨大canvasを無条件native resolution描画
- 同じassetの繰り返しdecode
- event listenerの累積
- detached DOMの保持
- transitionごとの巨大object cloneを無計測で乱用

---

# 11. Save / persistence

## 11.1 Single writer

Save writerは1つ。

Domain側は `REQUEST_SAVE` を発行する。

## 11.2 Save boundaries

最低限:

- Board復帰後
- village action確定後
- battle RESULT commit後
- capture/reward commit後
- day progression後

## 11.3 Crash consistency

battle中途半端な二重rewardを避けるためtransaction id / battle idを保持。

同じbattle completionを二度commitしない。

---

# 12. Data architecture

Mechanicsとdataを分離。

```text
/data/mapless
  encounters
  events
  facilities
  progression
  rewards
  evolution-overrides

/data/pokemon
  species
  moves
  items
  abilities
  type chart
```

Pokémon基礎dataのうちShowdownと重なる部分は、可能ならShowdown dataを基礎sourceとしてadapterから読む。

Mapless overrideは別layerに置く。

```text
base Pokemon data
 + Mapless override
 = runtime projection
```

巨大なhand-maintained duplicate tableを作らない。

---

# 13. Testing strategy

## 13.1 Test pyramid

### A. Pure core tests

- board generation
- day progression
- village 3 actions
- event choice
- economy
- reward
- growth
- save migration

### B. Battle adapter tests

- Showdown projection
- command mapping
- HP/PP commit
- held item consumption
- capture failure/success
- flee
- trainer replacement
- terminal handoff

### C. Golden behavior tests

旧Mapless canonicalと一致させる重要ケース。

### D. End-to-end slice

Start -> Board -> Battle/Event -> Result -> Board -> Save -> Continue

## 13.2 Battle parityの新定義

従来の「個別技effect familyをWeb独自実装して埋める」作業を主戦略にしない。

新しいBattle parityは:

1. Showdown semanticsへ正しく投影できるか
2. Mapless固有overrideが正しいか
3. persistent state round-tripが正しいか
4. presentation event conversionが正しいか

を中心にする。

## 13.3 Differential tests

可能な範囲で同じbattle setupをShowdown raw resultとMapless adapter経由で比較する。

差分がMapless overrideで説明できなければFAIL。

---

# 14. Migration plan

## Phase 0 — Freeze and inventory

- legacy implementationを削除しない
- new mechanics追加をlegacyへ原則停止
- current public pathを記録
- reusable data/assets/testsをcatalog化
- performance baselineを記録

## Phase 1 — New Core skeleton

実装:

- `new-core/state`
- `new-core/step`
- RNG
- serialization
- diagnostics

UIなしでもtest可能にする。

## Phase 2 — Minimal Mapless loop

実装:

```text
new run
board generation
board select
day increment
save/continue
```

battle/eventはstub requestでもよい。

## Phase 3 — Showdown bridge spike

最小1v1:

- Mapless Pokémon -> Showdown
- Fight command
- one turn
- HP/PP result
- faint
- Maplessへcommit

ここでbundle/runtime/performance feasibilityを確認。

## Phase 4 — First real vertical slice

```text
Start
 -> Board
 -> wild encounter
 -> Showdown-backed Battle
 -> KO
 -> EXP/reward
 -> Board
 -> Save
 -> Continue
```

これを最重要milestoneとする。

## Phase 5 — Battle commands

- switch
- trainer reserve
- bag
- capture
- flee
- replacement

## Phase 6 — Mapless loop breadth

- Village
- Facilities
- normal events
- boundary battles
- carryover
- progression

## Phase 7 — Presentation replacement

legacy viewを段階的にnew presentationへ置換。

## Phase 8 — Legacy retirement

同機能のNew Core verticalが:

- canonical test PASS
- Save/Continue PASS
- Safari validation PASS
- performance gate PASS

した時だけlegacy ownerを削除可能。

---

# 15. Directory proposal

```text
src-next/
  core/
    state/
    commands/
    events/
    rng/
    run/
    board/
    village/
    encounters/
    economy/
    growth/
    persistence/

  battle/
    showdown/
      adapter/
      projection/
      event-conversion/
    mapless-actions/
      capture/
      flee/
      battle-items/
    commit/

  presentation/
    battle/
    board/
    village/
    messages/
    animation/
    assets/

  platform/
    safari/
    storage/
    audio/
    diagnostics/

tests-next/
  core/
  battle/
  differential/
  e2e/
  performance/

third_party/
  licenses/
```

名称は実装時に調整可能だが、**domain / battle adapter / presentation / platformの境界は維持する。**

---

# 16. Coding rules

1. 新しいMapless mechanicsはpure/domain moduleを第一候補とする。
2. UI codeからcanonical stateを直接mutateしない。
3. ownerを増やす前に既存ownerを検索する。
4. Showdownで既に解決されるPokémon mechanicsをMapless専用switch文で再実装しない。
5. Mapless overrideは明示的なoverride layerに置く。
6. unsupported behaviorをgeneric damage等へsilent fallbackしない。
7. exactly-once対象にはidempotency testを置く。
8. testのためだけにproduction truthを複製しない。
9. performance-sensitive pathではallocation / render frequencyを計測する。
10. Safariで未確認なら「Safari PASS」と書かない。

---

# 17. Automation lane redesign

今後の3本のMapless hourly laneは以下へ変更する。

## Lane A — Reconstruction / Playable Core

主担当:

- New Core
- game loop
- Save/Continue
- vertical slice
- legacy -> next移行
- performance architecture

余剰capacityは最重要blockerへwork-steal。

## Lane B — Showdown Battle Integration

主担当:

- Showdown revision pin
- license notice
- battle projection
- command adapter
- persistent HP/PP round-trip
- Mapless-specific battle actions
- differential tests

原則として個別move/ability/itemを独自実装しない。

## Lane C — Presentation / Safari Performance

主担当:

- pixel-art presentation
- DP/PT-style battle UI
- event -> animation/message conversion
- asset resolver
- Safari input
- profiler/performance

mechanicsを実装しない。

---

# 18. What must NOT happen

- 新Coreとlegacy coreの両方に同じ技効果を追加する
- PokéRogue固有仕様をShowdownより優先する
- Showdown engineに村・報酬・日数進行まで埋め込む
- UI animation完了をbattle stateのtruthにする
- Safari patchごとに新しいBattle ownerを追加する
- 旧ツクールevent commandを1行ずつWebへ翻訳する
- 全機能完成後までperformance確認を後回しにする
- public build反映だけを「完成」と見なす

---

# 19. Definition of first success

新アーキテクチャの最初の成功条件は機能数ではなく、以下が一本通ること。

```text
Fresh Start
 -> canonical Day Board
 -> wild encounter
 -> Showdown-backed battle
 -> player selects move
 -> battle mechanics resolve
 -> pixel-art presentation
 -> foe faints
 -> HP/PP persistent commit
 -> EXP/reward exactly once
 -> Board return
 -> day progression
 -> Save
 -> browser reload
 -> Continue
 -> same canonical state
```

さらに:

- deterministic replay可能
- legacyと重要Mapless固有結果が一致
- Showdown differentialで説明不能差分なし
- iPad Safariで操作可能
- 明白なframe hitch / runaway memory / duplicate loopなし

を要求する。

---

# 20. User intervention policy

ユーザー作業を要求するのは、こちらから実行不能なものに限定する。

例:

- physical iPad Safariでしか確認できない最終感触
- 外部アカウント認証が必要な操作
- canonical挙動が資料上でも曖昧で、ゲームデザイン判断そのものが必要な場合

コード整理、仕様抽出、GitHub変更、テスト作成、比較、performance instrumentationは可能な限り開発側で進める。

---

# 21. Final architectural rule

> **Maplessの面白さは旧実装コードそのものではなく、ゲームデザイン・数値・イベント・進行・バランスにある。**
>
> **Pokémon battle mechanicsはShowdownを利用して再発明を避ける。**
>
> **Web実装は、純粋なMapless Core + Showdown Battle Adapter + ドット絵Presentation + Safari Platformとして作り直す。**
>
> **既存Web版は捨てず、正解比較・資産回収・段階移行のためのlegacyとして保持する。**
