import { allFaintedCanonical, resolveJudgeCanonical } from "./battle-core-judge.js";
import { reduceHpCanonical } from "./battle-core-turn-vertical-slice.js";

function clone(value) {
  return structuredClone(value);
}

function activeIndex(value, length, label) {
  const index = Number(value ?? 0);
  if (!Number.isInteger(index) || index < 0 || index >= length) {
    throw new RangeError(`${label} active party index out of range`);
  }
  return index;
}

export function materializeBattleParty(party, activePartyIndex, activePokemon, label = "party") {
  const source = Array.isArray(party) ? clone(party) : [clone(activePokemon)];
  if (source.length === 0) throw new RangeError(`${label} must contain the active Pokemon`);
  const index = activeIndex(Array.isArray(party) ? activePartyIndex : 0, source.length, label);
  source[index] = clone(activePokemon);
  return { party: source, activePartyIndex: index };
}

function initializeLiveHp(actions) {
  const hp = new Map();
  const totalHp = new Map();
  for (const action of actions) {
    const actor = Number(action?.battlerIndex);
    const target = Number(action?.targetBattlerIndex);
    if (Number.isInteger(actor) && actor >= 0 && action?.actorHpBefore !== undefined && !hp.has(actor)) {
      hp.set(actor, Number(action.actorHpBefore));
      totalHp.set(actor, Number(action.actorTotalHp ?? action.actorHpBefore));
    }
    if (Number.isInteger(target) && target >= 0 && action?.hpBefore !== undefined && !hp.has(target)) {
      hp.set(target, Number(action.hpBefore));
      totalHp.set(target, Number(action.totalHp ?? action.hpBefore));
    }
  }
  return { hp, totalHp };
}

function reflectLiveHp(parties, indexes, battlerIndex, hp) {
  if (battlerIndex === 0) parties.playerParty[indexes.playerPartyIndex].hp = Number(hp);
  if (battlerIndex === 1) parties.foeParty[indexes.foePartyIndex].hp = Number(hp);
}

function replacementCheckpoint(parties, indexes) {
  const playerActiveFainted = Number(parties.playerParty[indexes.playerPartyIndex]?.hp ?? 0) <= 0;
  const foeActiveFainted = Number(parties.foeParty[indexes.foePartyIndex]?.hp ?? 0) <= 0;
  return {
    player: playerActiveFainted && !allFaintedCanonical(parties.playerParty),
    foe: foeActiveFainted && !allFaintedCanonical(parties.foeParty),
  };
}

export function prepareBrowserPartyAwareJudgeStates(input = {}, {
  playerParty = [],
  foeParty = [],
  playerPartyIndex = 0,
  foePartyIndex = 0,
} = {}) {
  const prepared = clone(input);
  const parties = { playerParty: clone(playerParty), foeParty: clone(foeParty) };
  const indexes = {
    playerPartyIndex: activeIndex(playerPartyIndex, parties.playerParty.length, "player"),
    foePartyIndex: activeIndex(foePartyIndex, parties.foeParty.length, "foe"),
  };
  for (const round of prepared.rounds ?? []) {
    const actions = Array.isArray(round.actions) ? round.actions : [];
    const live = initializeLiveHp(actions);
    const order = Array.isArray(round.priorityOrder) ? round.priorityOrder.map(Number) : actions.map((_, index) => index);
    for (const actionIndex of order) {
      const action = actions[actionIndex];
      if (!action || action.kind !== "move") continue;
      const actor = Number(action.battlerIndex);
      if (Number.isInteger(actor) && Number(live.hp.get(actor) ?? 0) <= 0) {
        action.cancelledBecauseActorFainted = true;
        continue;
      }
      const confusion = action?.tryUseMoveResolution?.confusionDamageResolution;
      if (action.moveSkipped && confusion?.resolved && confusion.hpAfter !== undefined) {
        live.hp.set(actor, Number(confusion.hpAfter));
        reflectLiveHp(parties, indexes, actor, Number(confusion.hpAfter));
      }
      if (!action.moveSkipped && action.accuracyHit) {
        const target = Number(action.targetBattlerIndex);
        if (action.hpBefore !== undefined) {
          const hpBefore = Number(live.hp.get(target) ?? action.hpBefore);
          const totalHp = Number(live.totalHp.get(target) ?? action.totalHp ?? action.hpBefore);
          const reduced = reduceHpCanonical({
            hp: hpBefore,
            totalHp,
            amount: Number(action.calculatedDamage ?? 0),
            fainted: hpBefore <= 0,
            registerDamage: action.registerDamage !== false,
          });
          live.hp.set(target, reduced.hpAfter);
          reflectLiveHp(parties, indexes, target, reduced.hpAfter);
        }
        if (action.selfDamageAfterHit !== undefined) {
          const hpBefore = Number(live.hp.get(actor) ?? action.actorHpBefore ?? 0);
          const totalHp = Number(live.totalHp.get(actor) ?? action.actorTotalHp ?? action.actorHpBefore ?? 0);
          const reduced = reduceHpCanonical({
            hp: hpBefore,
            totalHp,
            amount: Number(action.selfDamageAfterHit),
            fainted: hpBefore <= 0,
            registerDamage: action.registerSelfDamage === true,
          });
          live.hp.set(actor, reduced.hpAfter);
          reflectLiveHp(parties, indexes, actor, reduced.hpAfter);
        }
      }
      action.dynamicJudgeBattlers = false;
      action.judgeState = {
        playerParty: clone(parties.playerParty),
        foeParty: clone(parties.foeParty),
        drawDecision: Number(action.drawDecision ?? 5),
      };
      const checkpoint = replacementCheckpoint(parties, indexes);
      if (checkpoint.player || checkpoint.foe) {
        action.stopRoundForReplacement = true;
        action.replacementCheckpoint = checkpoint;
      }
    }
  }
  return prepared;
}

export function buildBrowserBattleContinuationHandoff({
  playerParty = [],
  foeParty = [],
  playerPartyIndex = 0,
  foePartyIndex = 0,
  playerPokemon,
  foePokemon,
  decision = 0,
} = {}) {
  const player = materializeBattleParty(playerParty, playerPartyIndex, playerPokemon, "player");
  const foe = materializeBattleParty(foeParty, foePartyIndex, foePokemon, "foe");
  const judge = resolveJudgeCanonical({ playerParty: player.party, foeParty: foe.party, drawDecision: 5 });
  const resolvedDecision = Number(decision) === 0 ? Number(judge.decision) : Number(decision);
  const playerActiveFainted = Number(player.party[player.activePartyIndex]?.hp ?? 0) <= 0;
  const foeActiveFainted = Number(foe.party[foe.activePartyIndex]?.hp ?? 0) <= 0;
  return {
    decision: resolvedDecision,
    playerParty: player.party,
    foeParty: foe.party,
    playerActivePartyIndex: player.activePartyIndex,
    foeActivePartyIndex: foe.activePartyIndex,
    playerAllFainted: judge.playerAllFainted,
    foeAllFainted: judge.foeAllFainted,
    playerActiveFainted,
    foeActiveFainted,
    playerReplacementRequired: resolvedDecision === 0 && playerActiveFainted && !judge.playerAllFainted,
    foeReplacementRequired: resolvedDecision === 0 && foeActiveFainted && !judge.foeAllFainted,
    judgeOwner: {
      sourceSymbol: judge.sourceSymbol,
      sourceBodySha256: judge.sourceBodySha256,
      allFaintedBodySha256: judge.allFaintedBodySha256,
      pokemonAbleBodySha256: judge.pokemonAbleBodySha256,
    },
  };
}
