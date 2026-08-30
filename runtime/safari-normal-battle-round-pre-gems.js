export * from "./safari-normal-battle-round-pre-held-pp-berry.js";

import {
  resolveSafariNormalBattleOpponentResponse as resolveSafariNormalBattleOpponentResponseBase,
  resolveSafariNormalBattleRound as resolveSafariNormalBattleRoundBase,
} from "./safari-normal-battle-round-pre-held-pp-berry.js";
import { SAFARI_MOVE_MASTERS } from "./safari-playable-data.js";
import {
  commitHeldPpRestoreBerryCanonical,
} from "./item-held-pp-restore-berry-effects.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function resolvedActionsInOrder(result) {
  const round = result?.battleRuntimeIntegration?.combatTrace?.rounds?.[0];
  const actions = Array.isArray(round?.actions) ? round.actions : [];
  const order = Array.isArray(round?.priorityOrder)
    ? round.priorityOrder.map(Number).filter((index) => Number.isInteger(index) && index >= 0 && index < actions.length)
    : actions.map((_, index) => index);
  return order.map((index) => actions[index]).filter(Boolean);
}

function successfulMoveAction(action) {
  return action?.kind === "move" && action?.moveSkipped !== true && action?.lastMoveFailed !== true && Boolean(action?.moveId);
}

function actorSurvivedOwnAction(action, hpBefore) {
  let hp = Number(hpBefore ?? action?.actorHpBefore ?? 0);
  if (Number(action?.actorHpBefore ?? hp) > 0) hp = Number(action?.actorHpBefore ?? hp);
  const after = action?.abilityItemActionAfter;
  hp += Number(after?.userHpDelta ?? 0);
  hp += Number(after?.contactReactive?.userHpDelta ?? 0);
  return hp > 0;
}

function triggerContextForBattler(result, battlerIndex, pokemonBefore, opposingBefore, pokemonAfter, opposingAfter) {
  const index = Number(battlerIndex);
  for (const action of resolvedActionsInOrder(result)) {
    if (!successfulMoveAction(action)) continue;
    if (Number(action?.battlerIndex) === index) {
      if (!actorSurvivedOwnAction(action, pokemonBefore?.hp)) continue;
      const opposing = Number(action?.targetBattlerIndex) === (index === 0 ? 1 : 0) && Number(action?.hpAfter ?? opposingBefore?.hp ?? 0) <= 0
        ? {}
        : opposingBefore;
      return { completedMove: true, completedMoveId: String(action.moveId).trim().toUpperCase(), activeAtTrigger: true, opposingPokemon: opposing };
    }
    if (Number(action?.targetBattlerIndex) === index) {
      if (Number(action?.hpAfter ?? pokemonAfter?.hp ?? 0) <= 0) continue;
      return { completedMove: true, completedMoveId: null, activeAtTrigger: true, opposingPokemon: opposingAfter };
    }
    if (Number(pokemonAfter?.hp ?? 0) > 0) {
      return { completedMove: true, completedMoveId: null, activeAtTrigger: true, opposingPokemon: opposingAfter };
    }
  }
  return { completedMove: false, completedMoveId: null, activeAtTrigger: Number(pokemonAfter?.hp ?? 0) > 0, opposingPokemon: opposingAfter };
}

function commitOntoCurrentPokemon(currentPokemon, resolvedPokemon) {
  const next = structuredClone(currentPokemon);
  next.moves = structuredClone(resolvedPokemon.moves ?? next.moves ?? []);
  if (Object.prototype.hasOwnProperty.call(next, "held_item")) next.held_item = resolvedPokemon.held_item ?? null;
  if (Object.prototype.hasOwnProperty.call(next, "item")) next.item = resolvedPokemon.item ?? null;
  return next;
}

function applyPlayerBerry(runtime, before, result) {
  if (result?.playerReplacementApplied) return null;
  const party = runtime?.player?.party;
  const index = Number(before.playerPartyIndex);
  const pokemon = party?.[index];
  if (!pokemon) return null;
  const opposingAfter = result?.foeReplacementApplied ? {} : (result?.foe ?? stateOf(runtime).battle?.foe ?? before.foe);
  const trigger = triggerContextForBattler(result, 0, before.player, before.foe, pokemon, opposingAfter);
  if (!trigger.completedMoveId) return null;
  const committed = commitHeldPpRestoreBerryCanonical({
    pokemon,
    opposingPokemon: trigger.opposingPokemon,
    moveMasters: SAFARI_MOVE_MASTERS,
    completedMove: true,
    completedMoveId: trigger.completedMoveId,
    activeAtTrigger: trigger.activeAtTrigger,
  });
  if (committed.resolution.triggered) party[index] = commitOntoCurrentPokemon(pokemon, committed.pokemon);
  return committed;
}

function applyFoeBerry(runtime, before, result) {
  if (result?.foeReplacementApplied) return null;
  const battle = stateOf(runtime).battle;
  if (!battle?.foe) return null;
  const playerAfter = result?.playerReplacementApplied ? {} : (result?.player ?? runtime?.player?.party?.[Number(before.playerPartyIndex)] ?? before.player);
  const trigger = triggerContextForBattler(result, 1, before.foe, before.player, battle.foe, playerAfter);
  if (!trigger.completedMoveId) return null;
  const committed = commitHeldPpRestoreBerryCanonical({
    pokemon: battle.foe,
    opposingPokemon: trigger.opposingPokemon,
    moveMasters: SAFARI_MOVE_MASTERS,
    completedMove: true,
    completedMoveId: trigger.completedMoveId,
    activeAtTrigger: trigger.activeAtTrigger,
  });
  if (!committed.resolution.triggered) return committed;
  battle.foe = commitOntoCurrentPokemon(battle.foe, committed.pokemon);
  if (battle.kind === "trainer" && Array.isArray(battle.trainer_party)) {
    const foeIndex = Number(before.foePartyIndex);
    if (battle.trainer_party[foeIndex]) battle.trainer_party[foeIndex] = structuredClone(battle.foe);
  }
  return committed;
}

function prepare(runtime) {
  const battle = stateOf(runtime).battle;
  if (!battle || battle.completed) throw new Error("active battle is required");
  const playerPartyIndex = Number(battle.player_party_index ?? 0);
  return {
    playerPartyIndex,
    foePartyIndex: Number(battle.trainer_party_index ?? 0),
    player: structuredClone(runtime?.player?.party?.[playerPartyIndex] ?? {}),
    foe: structuredClone(battle.foe ?? {}),
  };
}

function applyHeldPpBerries(runtime, before, result) {
  const player = applyPlayerBerry(runtime, before, result);
  const foe = applyFoeBerry(runtime, before, result);
  if (!player?.resolution?.triggered && !foe?.resolution?.triggered) return result;
  const battle = stateOf(runtime).battle;
  const playerRuntime = runtime?.player?.party?.[Number(before.playerPartyIndex)] ?? result?.player;
  return {
    ...result,
    ...(playerRuntime ? { player: structuredClone(playerRuntime) } : {}),
    ...(battle?.foe ? { foe: structuredClone(battle.foe) } : {}),
    heldPpRestoreBerry: Object.freeze({
      player: player?.resolution ?? null,
      foe: foe?.resolution ?? null,
    }),
  };
}

export function resolveSafariNormalBattleRound(runtime, selectedMoveId) {
  const before = prepare(runtime);
  return applyHeldPpBerries(runtime, before, resolveSafariNormalBattleRoundBase(runtime, selectedMoveId));
}

export function resolveSafariNormalBattleOpponentResponse(runtime) {
  const before = prepare(runtime);
  return applyHeldPpBerries(runtime, before, resolveSafariNormalBattleOpponentResponseBase(runtime));
}

export function resolveSafariNormalWildOpponentResponse(runtime) {
  const battle = stateOf(runtime).battle;
  if (!battle || battle.completed || battle.kind !== "wild") throw new Error("active wild battle is required");
  return resolveSafariNormalBattleOpponentResponse(runtime);
}