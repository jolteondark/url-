import assert from 'node:assert/strict';
import { createShowdownStreamSession } from '../src-next/core/battle/showdown-stream-session.js';

class Stream { async write() {} }
class BattleStream extends Stream { constructor() { super(); this.battle = null; } }

function fakeShowdown(rawAbility) {
  return {
    BattleStreams: {
      BattleStream,
      getPlayerStreams(stream) {
        const omniscient = new Stream();
        omniscient.write = async (value) => {
          if (!value.startsWith('>player p2 ')) return;
          stream.battle = {
            ended: false,
            winner: '',
            turn: 0,
            requestCount: 0,
            sides: [
              { pokemon: [{ level: 1, ability: rawAbility, hp: 35, maxhp: 35, status: '', statusState: {}, item: '', fainted: false, moveSlots: [{ id: 'thunderbolt', pp: 15, maxpp: 15 }] }] },
              { pokemon: [{ level: 1, ability: 'swiftswim', hp: 20, maxhp: 20, status: '', statusState: {}, item: '', fainted: false, moveSlots: [{ id: 'splash', pp: 40, maxpp: 40 }] }] },
            ],
            initEffectState(initial) { return { ...initial }; },
            makeRequest() { this.requestCount += 1; },
          };
        };
        return { omniscient, p1: new Stream(), p2: new Stream() };
      },
    },
    Teams: { pack: () => 'PACKED' },
  };
}

const p1 = { id: 'hero', species: 'Pikachu', level: 1, ability: 'Static', hp: 17, maxhp: 35, status: '', heldItem: '', moves: [{ id: 'thunderbolt', pp: 4, maxpp: 15 }] };
const p2 = { id: 'wild', species: 'Magikarp', level: 1, ability: 'Swift Swim', hp: 11, maxhp: 20, status: '', heldItem: '', moves: [{ id: 'splash', pp: 9, maxpp: 40 }] };

const matching = createShowdownStreamSession(fakeShowdown('static'), { p1: { name: 'Mapless', team: [p1] }, p2: { name: 'Wild', team: [p2] } });
assert.equal(await matching.start(), true);
assert.equal(matching.battleStream.battle.requestCount, 1, 'matching canonical ability should reach first request');
assert.equal(matching.battleStream.battle.sides[0].pokemon[0].hp, 17, 'matching ability should allow HP hydration');

const mismatch = createShowdownStreamSession(fakeShowdown('lightningrod'), { p1: { name: 'Mapless', team: [p1] }, p2: { name: 'Wild', team: [p2] } });
await assert.rejects(() => mismatch.start(), /Persistent ability projection mismatch: static\/lightningrod/);
assert.equal(mismatch.battleStream.battle.sides[0].pokemon[0].hp, 35, 'ability mismatch must fail before HP hydration');
assert.equal(mismatch.battleStream.battle.requestCount, 0, 'ability mismatch must fail before request regeneration');

const unspecified = { ...p1 };
delete unspecified.ability;
const canonicalDefault = createShowdownStreamSession(fakeShowdown('static'), { p1: { name: 'Mapless', team: [unspecified] }, p2: { name: 'Wild', team: [p2] } });
assert.equal(await canonicalDefault.start(), true, 'missing persistent ability leaves canonical Showdown ability authoritative');

console.log('reconstruction Showdown starting ability differential smoke: ok');
