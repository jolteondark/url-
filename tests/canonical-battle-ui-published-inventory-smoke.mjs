import assert from 'node:assert/strict';
import {
  PUBLISHED_CANONICAL_BATTLE_UI,
  canonicalBattleUiCandidates,
  canonicalBattleUiResolutionState,
} from '../runtime/canonical-battle-ui-sources.js';

const expected = new Map([
  ['ability_bar.png', ['c2dd369fc4839df86bfab3ef00fc0e2a8574bf41', 941]],
  ['cursor_mega.png', ['0dafea4f5876c72a0f26eec9515832e1a1168636', 2131]],
  ['cursor_shift.png', ['6045bfe396f7abe54ee48959a9c2589cece403c7', 608]],
  ['databox_normal.png', ['fcc043f814f25e8345ac7b51e5f7573d2fa60d6d', 938]],
  ['databox_normal_foe.png', ['5d223b28161ed851ad12602c02058f773d7bec03', 783]],
  ['databox_safari.png', ['5d85afa5b9af509632d664c856799ef5a4b93567', 1102]],
  ['databox_thin.png', ['cdfe85b98f31aa4c68884d267e99193fd6f4d74a', 756]],
  ['databox_thin_foe.png', ['0c3a586cf977e31a3bc5cd68460ede0f4c11086a', 783]],
  ['icon_ball.png', ['093721a9f94548d1c9128f6c68259735bb4753c2', 510]],
  ['icon_ball_empty.png', ['5d784db19b91af9a9c63c0ad941aeb2e620bd371', 385]],
  ['icon_ball_faint.png', ['b98a4c7410d390a84d022b7abbe3e5dfa9994378', 502]],
  ['icon_ball_status.png', ['06d84406bbcd0f33b9287855e37a0664d0f138f7', 496]],
  ['icon_mega.png', ['aaaf0b98663d23612f7ae9f8e420df58dae40392', 556]],
  ['icon_numbers.png', ['f7bfb20dbf580186b3674794203c7ecafa6330b1', 639]],
  ['icon_own.png', ['33975e3b2c63dc00ebe1c386a77d927248800ba9', 390]],
  ['icon_primal_Groudon.png', ['683eae62243c2d9be2cd6918f0b299e94f5c85ee', 645]],
  ['icon_primal_Kyogre.png', ['6f7d3592b5f801df40f463881d3277ecafaf6eb0', 650]],
  ['judgment.png', ['0d43454e9784ef60048e839262c057d82d1696dd', 681]],
  ['overlay_exp.png', ['025c43b59ed4a55f7564296b54742b2a4dd02ac2', 92]],
  ['overlay_fight.png', ['d61ef321964b693e31bca81a34a6fd0dba5e5a60', 1602]],
  ['overlay_lineup.png', ['2cb2a57d47d003d1b4aed5baebb0f691a458dd43', 328]],
  ['overlay_lv.png', ['758fccbb3d776f6731fa2f7600aee4913a37d515', 328]],
  ['overlay_message.png', ['aa8257b992a407256968484fc7b35f2e6ab8bb60', 947]],
]);

for (const [name, [canonicalGitBlobSha, bytes]] of expected) {
  const published = PUBLISHED_CANONICAL_BATTLE_UI[name];
  assert.ok(published, `${name} should be registered as a published canonical asset`);
  assert.equal(published.canonicalGitBlobSha, canonicalGitBlobSha);
  assert.equal(published.bytes, bytes);
  assert.deepEqual(canonicalBattleUiCandidates(name), [`assets/canonical-battle-ui/${name}`]);
  const state = canonicalBattleUiResolutionState(name);
  assert.equal(state.status, 'eligible');
  assert.equal(state.published, published);
}

console.log('canonical battle UI published inventory smoke: ok');
