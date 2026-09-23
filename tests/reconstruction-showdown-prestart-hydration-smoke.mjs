import assert from 'node:assert/strict';
import { createShowdownStreamSession } from '../src-next/core/battle/showdown-stream-session.js';

class FakeStream { async write() {} }
class FakeBattleStream {
  constructor() { this.battle = null; }
}

let observedAtStart = null;
const showdown = {
  Teams: { pack(team) { return JSON.stringify(team); } },
  BattleStreams: {
    BattleStream: FakeBattleStream,
    getPlayerStreams(stream) {
      const battle = {
        sides: [null, null],
        started: false,
        ended: false,
        turn: 0,
        winner: '',
        start() {
          observedAtStart = this.sides.map((side) => side.pokemon.map((pokemon) => ({
            hp: pokemon.hp,
            status: pokemon.status,
            item: pokemon.item,
            pp: pokemon.moveSlots.map((move) => move.pp),
          })));
          this.started = true;
        },
      };
      const omniscient = {
        async write(command) {
          if (command.startsWith('>start ')) {
            stream.battle = battle;
            return;
          }
          const match = command.match(/^>player (p[12]) (.+)$/);
          if (!match) return;
          const sideIndex = Number(match[1][1]) - 1;
          const payload = JSON.parse(match[2]);
          const team = JSON.parse(payload.team);
          battle.sides[sideIndex] = {
            pokemon: team.map((set) => ({
              species: { id: set.species.toLowerCase() },
              level: set.level,
              ability: set.ability.toLowerCase(),
              hp: 100,
              maxhp: 100,
              status: '',
              statusState: {},
              item: set.item.toLowerCase().replace(/[^a-z0-9]+/g, ''),
              fainted: false,
              moveSlots: set.moves.map((id) => ({ id, pp: 35, maxpp: 35 })),
            })),
          };
          if (battle.sides.every(Boolean) && !battle.started) battle.start();
        },
      };
      return { omniscient, p1: new FakeStream(), p2: new FakeStream() };
    },
  },
};

const session = createShowdownStreamSession(showdown, {
  formatid: 'gen9customgame',
  p1: { name: 'Mapless', team: [{ id: 'hero', species: 'Pikachu', level: 10, ability: 'Static', hp: 17, status: 'par', heldItem: 'Oran Berry', moves: [{ id: 'tackle', pp: 7, maxpp: 35 }] }] },
  p2: { name: 'Wild', team: [{ id: 'wild', species: 'Rattata', level: 8, ability: 'Run Away', hp: 23, status: '', heldItem: '', moves: [{ id: 'tackle', pp: 9, maxpp: 35 }] }] },
});

assert.equal(await session.start(), true);
assert.deepEqual(observedAtStart, [
  [{ hp: 17, status: 'par', item: 'oranberry', pp: [7] }],
  [{ hp: 23, status: '', item: '', pp: [9] }],
], 'Showdown start/switch-in hooks must observe persistent state, not constructor defaults');
assert.equal(session.battleStream.battle.started, true);
console.log('reconstruction-showdown-prestart-hydration-smoke: ok');
