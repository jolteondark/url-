import { projectP1BattleView, projectP1BoardView } from '../presentation/battle/p1-pixel-view.js';

const STYLE = `
.mapless-p1{box-sizing:border-box;max-width:760px;margin:0 auto;padding:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#17233b;background:#dfe9d5;min-height:100%;image-rendering:pixelated}
.mapless-p1 *{box-sizing:border-box}
.mapless-p1 button{font:inherit;border:2px solid #17233b;background:#f7f3df;color:#17233b;border-radius:0;min-height:44px;padding:7px 10px;touch-action:manipulation}
.mapless-p1 button:disabled{opacity:.45}
.mapless-p1__top{display:flex;justify-content:space-between;gap:10px;border:2px solid #17233b;background:#f7f3df;padding:7px 9px;margin-bottom:10px}
.mapless-p1__board{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.mapless-p1__slot{aspect-ratio:1/1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}
.mapless-p1__slot small{font-size:10px;margin-top:3px}
.mapless-p1__battle{display:grid;grid-template-rows:1fr auto;min-height:430px;border:2px solid #17233b;background:#b8d5bd}
.mapless-p1__field{position:relative;min-height:300px;overflow:hidden;background:linear-gradient(#a7d4df 0 55%,#b8cf8f 55% 100%)}
.mapless-p1__sprite{position:absolute;width:192px;height:192px;object-fit:contain;image-rendering:pixelated}
.mapless-p1__sprite--foe{right:6%;top:4%}
.mapless-p1__sprite--player{left:4%;bottom:0}
.mapless-p1__fallback{position:absolute;font-weight:700}
.mapless-p1__fallback--foe{right:10%;top:26%}
.mapless-p1__fallback--player{left:8%;bottom:25%}
.mapless-p1__status{position:absolute;width:min(46%,250px);border:2px solid #17233b;background:#f7f3df;padding:6px}
.mapless-p1__status--foe{left:4%;top:5%}
.mapless-p1__status--player{right:4%;bottom:5%}
.mapless-p1__hp{height:8px;border:1px solid #17233b;background:#d8d8c7;margin-top:4px}
.mapless-p1__hp>span{display:block;height:100%;background:#4e9d4f}
.mapless-p1__bottom{background:#f7f3df;border-top:2px solid #17233b;padding:8px}
.mapless-p1__message{min-height:42px;padding:5px 2px}
.mapless-p1__moves{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.mapless-p1__controls{display:flex;gap:6px;margin-bottom:8px}
.mapless-p1__screen[hidden]{display:none}
@media(max-width:560px){.mapless-p1__board{grid-template-columns:repeat(2,minmax(0,1fr))}.mapless-p1__battle{min-height:390px}.mapless-p1__field{min-height:270px}.mapless-p1__sprite{width:160px;height:160px}}
`;

function createStaticDom(document) {
  const shell = document.createElement('div');
  shell.className = 'mapless-p1';
  shell.innerHTML = `
    <style>${STYLE}</style>
    <div class="mapless-p1__controls">
      <button type="button" data-action="fresh">Fresh Start</button>
      <button type="button" data-action="continue">Continue</button>
    </div>
    <div class="mapless-p1__top"><span data-day>Day -</span><span data-money>¥0</span></div>
    <section class="mapless-p1__screen" data-board>
      <div class="mapless-p1__board" data-board-slots></div>
    </section>
    <section class="mapless-p1__screen mapless-p1__battle" data-battle hidden>
      <div class="mapless-p1__field">
        <div class="mapless-p1__status mapless-p1__status--foe" data-foe-status></div>
        <img class="mapless-p1__sprite mapless-p1__sprite--foe" data-foe-sprite alt="">
        <span class="mapless-p1__fallback mapless-p1__fallback--foe" data-foe-fallback></span>
        <img class="mapless-p1__sprite mapless-p1__sprite--player" data-player-sprite alt="">
        <span class="mapless-p1__fallback mapless-p1__fallback--player" data-player-fallback></span>
        <div class="mapless-p1__status mapless-p1__status--player" data-player-status></div>
      </div>
      <div class="mapless-p1__bottom">
        <div class="mapless-p1__message" data-message aria-live="polite"></div>
        <div class="mapless-p1__moves" data-moves></div>
        <button type="button" data-action="reward" hidden>報酬を受け取る</button>
      </div>
    </section>
  `;
  return shell;
}

function statusHtml(document, member) {
  const wrap = document.createDocumentFragment();
  const line = document.createElement('div');
  line.textContent = member ? `${member.name || member.species} Lv.${member.level}` : '---';
  wrap.append(line);
  if (member) {
    const hpText = document.createElement('div');
    hpText.textContent = `HP ${member.hp}/${member.maxhp}${member.status ? `  ${member.status}` : ''}`;
    wrap.append(hpText);
    const hp = document.createElement('div');
    hp.className = 'mapless-p1__hp';
    const fill = document.createElement('span');
    fill.style.width = `${Math.round(member.hpRatio * 100)}%`;
    hp.append(fill);
    wrap.append(hp);
  }
  return wrap;
}

function setSprite(image, fallback, member) {
  const sprite = member?.sprite;
  if (sprite?.src) {
    if (image.src !== sprite.src) image.src = sprite.src;
    image.hidden = false;
    fallback.hidden = true;
  } else {
    image.removeAttribute('src');
    image.hidden = true;
    fallback.textContent = member?.species ?? '';
    fallback.hidden = !member;
  }
}

function slotLabel(slot) {
  if (slot.consumed) return ['済', slot.kind];
  if (slot.kind === 'wild') return ['WILD', slot.type ?? ''];
  if (slot.kind === 'next_day') return ['NEXT DAY', ''];
  return [slot.kind.replaceAll('_', ' ').toUpperCase(), ''];
}

export function createP1PixelDomRenderer(root, {
  onFreshStart = () => {},
  onContinue = () => {},
  onBoardSlot = () => {},
  onMove = () => {},
  onReward = () => {},
} = {}) {
  const document = root?.ownerDocument ?? globalThis.document;
  if (!root || !document?.createElement) throw new Error('P1 pixel renderer requires a DOM root');
  const shell = createStaticDom(document);
  root.replaceChildren(shell);
  const q = (selector) => shell.querySelector(selector);
  const boardScreen = q('[data-board]');
  const battleScreen = q('[data-battle]');
  const slotsRoot = q('[data-board-slots]');
  const movesRoot = q('[data-moves]');
  const message = q('[data-message]');
  const reward = q('[data-action="reward"]');
  let busy = false;

  q('[data-action="fresh"]').addEventListener('click', () => onFreshStart());
  q('[data-action="continue"]').addEventListener('click', () => onContinue());
  reward.addEventListener('click', () => onReward());

  function setBusy(value) {
    busy = Boolean(value);
    shell.querySelectorAll('button').forEach((button) => { button.disabled = busy || button.dataset.enabled === 'false'; });
  }

  function setMessage(text) {
    message.textContent = String(text ?? '');
  }

  function animateNode(node, keyframes, options) {
    if (!node || node.hidden || typeof node.animate !== 'function') return null;
    try {
      return node.animate(keyframes, { duration: 220, easing: 'steps(2,end)', ...options });
    } catch {
      return null;
    }
  }

  function presentEvent(event) {
    const type = String(event?.type ?? '');
    const side = event?.side === 'player' ? 'player' : 'foe';
    const playerSprite = q('[data-player-sprite]');
    const foeSprite = q('[data-foe-sprite]');
    const target = side === 'player' ? playerSprite : foeSprite;
    if (type === 'POKEMON_SENT_OUT') {
      animateNode(target, [{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 260 });
    } else if (type === 'MOVE_USED') {
      const direction = side === 'player' ? 1 : -1;
      animateNode(target, [
        { transform: 'translateX(0)' },
        { transform: `translateX(${direction * 12}px)` },
        { transform: 'translateX(0)' },
      ], { duration: 180 });
    } else if (type === 'DAMAGE_APPLIED') {
      animateNode(target, [
        { transform: 'translateX(0)', opacity: 1 },
        { transform: 'translateX(-6px)', opacity: .55 },
        { transform: 'translateX(6px)', opacity: 1 },
        { transform: 'translateX(0)', opacity: 1 },
      ], { duration: 220 });
    } else if (type === 'POKEMON_FAINTED') {
      animateNode(target, [
        { transform: 'translateY(0)', opacity: 1 },
        { transform: 'translateY(22px)', opacity: 0 },
      ], { duration: 300, fill: 'forwards' });
    } else if (type === 'BATTLE_WON') {
      animateNode(playerSprite, [
        { transform: 'translateY(0)' },
        { transform: 'translateY(-8px)' },
        { transform: 'translateY(0)' },
      ], { duration: 260 });
    }
  }

  function render({ state, resolved = null, activeBattle = null, canContinue = false } = {}) {
    if (!state) {
      boardScreen.hidden = true;
      battleScreen.hidden = true;
      q('[data-day]').textContent = 'Day -';
      q('[data-money]').textContent = '¥0';
      q('[data-action="continue"]').dataset.enabled = canContinue ? 'true' : 'false';
      setBusy(busy);
      return;
    }
    const board = projectP1BoardView(state);
    const battle = projectP1BattleView({ state, resolved, activeBattle });
    q('[data-day]').textContent = `Day ${board.day}`;
    q('[data-money]').textContent = `¥${board.money}`;
    q('[data-action="continue"]').dataset.enabled = canContinue ? 'true' : 'false';

    boardScreen.hidden = !board.visible;
    if (board.visible) {
      slotsRoot.replaceChildren();
      for (const slot of board.slots) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'mapless-p1__slot';
        button.dataset.enabled = slot.enabled ? 'true' : 'false';
        const [label, detail] = slotLabel(slot);
        const main = document.createElement('strong');
        main.textContent = label;
        const small = document.createElement('small');
        small.textContent = detail;
        button.append(main, small);
        button.addEventListener('click', () => onBoardSlot(slot.index, slot));
        slotsRoot.append(button);
      }
    }

    battleScreen.hidden = !battle.visible;
    if (battle.visible) {
      q('[data-foe-status]').replaceChildren(statusHtml(document, battle.foe));
      q('[data-player-status]').replaceChildren(statusHtml(document, battle.player));
      setSprite(q('[data-foe-sprite]'), q('[data-foe-fallback]'), battle.foe);
      setSprite(q('[data-player-sprite]'), q('[data-player-fallback]'), battle.player);
      movesRoot.replaceChildren();
      for (const [index, move] of (battle.player?.moves ?? []).entries()) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.enabled = battle.commandEnabled && move.pp > 0 ? 'true' : 'false';
        button.textContent = `${move.id}  ${move.pp}/${move.maxpp}`;
        button.addEventListener('click', () => onMove(index + 1, move));
        movesRoot.append(button);
      }
      reward.hidden = !battle.rewardPending;
      reward.dataset.enabled = battle.rewardPending ? 'true' : 'false';
    }
    setBusy(busy);
  }

  return Object.freeze({ render, setBusy, setMessage, presentEvent, root: shell });
}
