import assert from 'node:assert/strict';
import { p1PresentationMessage } from '../src-next/presentation/messages/p1-event-message.js';

assert.equal(p1PresentationMessage({ type: 'BATTLE_WON' }), '戦闘に勝利した！');
assert.equal(p1PresentationMessage({ type: 'EXP_GAINED', amount: 12 }), '12 EXPを獲得！');
assert.equal(p1PresentationMessage({ type: 'ITEM_REWARDED', itemId: 'POTION', quantity: 1 }), 'POTION ×1 を獲得！');
assert.equal(p1PresentationMessage({ type: 'BOARD_READY', day: 2 }), 'Day 2');
assert.equal(p1PresentationMessage({ type: 'UNKNOWN' }), '');
console.log('P1 semantic event messages: ok');
