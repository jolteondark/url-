import { calculateMaplessBattleExp } from '../growth/mapless-experience.js';

function stableMemberId(member) {
  const raw = member?.id ?? member?.personalId;
  if (raw === undefined || raw === null || String(raw) === '') throw new Error('battle reward requires stable party member ids');
  return String(raw);
}

function defeatedFacts(encounter) {
  const level = Number(encounter?.level);
  const baseExp = Number(encounter?.baseExp ?? encounter?.base_exp);
  if (!Number.isInteger(level) || level < 1) throw new Error('battle reward requires defeated encounter level');
  if (!Number.isInteger(baseExp) || baseExp < 0) throw new Error('battle reward requires defeated encounter base Exp');
  return { level, baseExp };
}

export function resolveMaplessNormalBattleVictoryReward({ kind, encounter, party, recipientIds }) {
  if (kind !== 'wild' && kind !== 'trainer') throw new Error(`unsupported normal battle reward kind: ${kind}`);
  if (!Array.isArray(party) || party.length === 0) throw new Error('battle reward requires a party');
  if (!Array.isArray(recipientIds) || recipientIds.length === 0) throw new Error('battle reward requires at least one EXP recipient');
  const recipients = new Set(recipientIds.map(String));
  if (recipients.size !== recipientIds.length) throw new Error('battle reward EXP recipients must be unique');
  const byId = new Map(party.map((member) => [stableMemberId(member), member]));
  const defeated = defeatedFacts(encounter);
  const partyExp = [];
  for (const memberId of recipients) {
    const member = byId.get(memberId);
    if (!member) throw new Error(`battle reward targets unknown party member: ${memberId}`);
    const level = Number(member.level);
    if (!Number.isInteger(level) || level < 1) throw new Error(`battle reward requires a valid level for ${memberId}`);
    partyExp.push({
      memberId,
      exp: calculateMaplessBattleExp({
        defeatedLevel: defeated.level,
        baseExp: defeated.baseExp,
        gainerLevel: level,
        moreExpFromTrainerPokemon: kind === 'trainer',
        trainerBattle: kind === 'trainer',
        scaledExpFormula: false,
      }),
    });
  }
  return Object.freeze({
    items: Object.freeze([{ id: 'POTION', quantity: 1 }]),
    partyExp: Object.freeze(partyExp.map((entry) => Object.freeze(entry))),
  });
}
