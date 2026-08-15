function asInt(value, field) {
  const n = Number(value);
  if (!Number.isInteger(n)) throw new TypeError(`${field} must be an integer`);
  return n;
}

function nextRandom(values, limit, cursor) {
  if (!Array.isArray(values) || cursor.index >= values.length) {
    throw new RangeError("deterministic random input exhausted");
  }
  const n = asInt(values[cursor.index++], "random value");
  if (n < 0 || n >= limit) throw new RangeError(`random value must be in [0, ${limit})`);
  return n;
}

function dexModifier(ownedCount) {
  if (ownedCount > 600) return 5;
  if (ownedCount > 450) return 4;
  if (ownedCount > 300) return 3;
  if (ownedCount > 150) return 2;
  if (ownedCount > 30) return 1;
  return 0;
}

/**
 * Portable projection of canonical Battle_CatchAndStoreMixin#pbCaptureCalc.
 * Ball-effect callbacks are resolved before entry as modifiedCatchRate/unconditional.
 * Randomness is injected as deterministic integer draws in canonical call order.
 */
export function calculateCapture(input) {
  const totalHp = asInt(input.totalHp, "totalHp");
  const hp = asInt(input.hp, "hp");
  if (totalHp <= 0 || hp < 0 || hp > totalHp) throw new RangeError("invalid HP state");
  if (input.debugCapture) return { numShakes: 4, criticalCapture: false, x: null, y: null, randomUsed: 0 };

  let catchRate = asInt(input.catchRate, "catchRate");
  if (catchRate < 0) throw new RangeError("catchRate must be non-negative");
  if (input.ultraBeast && input.ball !== "BEASTBALL") {
    catchRate = Math.floor(catchRate / 10);
  } else if (input.modifiedCatchRate != null) {
    catchRate = asInt(input.modifiedCatchRate, "modifiedCatchRate");
  }

  let x = (((3 * totalHp) - (2 * hp)) * catchRate) / (3 * totalHp);
  const status = input.status ?? "NONE";
  if (status === "SLEEP" || status === "FROZEN") x *= 2.5;
  else if (status !== "NONE") x *= 1.5;
  x = Math.floor(x);
  if (x < 1) x = 1;
  if (x >= 255 || input.unconditional) {
    return { numShakes: 4, criticalCapture: false, x, y: null, randomUsed: 0 };
  }

  const y = Math.floor(65536 / ((255 / x) ** 0.1875));
  const cursor = { index: 0 };
  const randomValues = input.randomValues ?? [];
  if (input.enableCriticalCaptures) {
    let modifier = dexModifier(asInt(input.ownedCount ?? 0, "ownedCount"));
    if (input.catchingCharm) modifier *= 2;
    const c = Math.floor((x * modifier) / 12);
    if (c > 0 && nextRandom(randomValues, 256, cursor) < c) {
      const caught = nextRandom(randomValues, 65536, cursor) < y;
      return {
        numShakes: caught ? 4 : 0,
        criticalCapture: true,
        x,
        y,
        randomUsed: cursor.index,
      };
    }
  }

  let numShakes = 0;
  for (let i = 0; i < 4; i += 1) {
    if (numShakes < i) break;
    if (nextRandom(randomValues, 65536, cursor) < y) numShakes += 1;
  }
  return { numShakes, criticalCapture: false, x, y, randomUsed: cursor.index };
}

/**
 * Portable control-flow projection of canonical pbThrowPokeBall around capture result.
 * Battle/scene/Party/Storage helpers are emitted as operations rather than reimplemented.
 */
export function resolveCaptureFlow(input) {
  const operations = [];
  if (input.targetFainted) {
    operations.push({ op: "no_target" });
    return { result: "no_target", numShakes: null, criticalCapture: false, decision: input.decision ?? 0, operations };
  }
  if (input.trainerBattle && !(input.snagBall && input.shadowPokemon)) {
    operations.push({ op: "throw_and_deflect" }, { op: "trainer_block" });
    return { result: "blocked", numShakes: null, criticalCapture: false, decision: input.decision ?? 0, operations };
  }

  const capture = calculateCapture(input.capture);
  operations.push({ op: "throw", numShakes: capture.numShakes, criticalCapture: capture.criticalCapture });
  if (capture.numShakes !== 4) {
    operations.push({ op: "fail_catch", numShakes: capture.numShakes });
    return {
      result: "failed",
      numShakes: capture.numShakes,
      criticalCapture: capture.criticalCapture,
      decision: input.decision ?? 0,
      firstPokeBall: input.pokeBallFailed ? (input.firstPokeBall ?? null) : input.ball,
      pokeBallFailed: true,
      operations,
      capture,
    };
  }

  operations.push({ op: "capture_success" });
  operations.push({ op: "remove_from_battle_party" });
  if (input.gainExpForCapture) {
    operations.push({ op: "set_captured", value: true });
    operations.push({ op: "gain_exp" });
    operations.push({ op: "set_captured", value: false });
  }
  operations.push({ op: "reset_battler" });
  let decision = input.decision ?? 0;
  if (input.allFaintedAfterCapture) decision = input.trainerBattle ? 1 : 4;
  if (input.snagBall) operations.push({ op: "transfer_owner_to_player" });
  operations.push({ op: "on_catch" });
  operations.push({ op: "set_poke_ball", value: input.ball });
  if (input.mega) operations.push({ op: "make_unmega" });
  operations.push({ op: "make_unprimal" });
  if (input.shadowPokemon) operations.push({ op: "update_shadow_moves" });
  operations.push({ op: "record_first_moves" });
  if (input.hasGetForm) operations.push({ op: "clear_forced_form" });
  operations.push({ op: "on_leaving_battle", caught: true, usedInBattle: true });
  operations.push({ op: "hide_capture_ball" });
  operations.push({ op: "queue_caught_pokemon" });

  return {
    result: "caught",
    numShakes: 4,
    criticalCapture: capture.criticalCapture,
    decision,
    pokeBallFailed: Boolean(input.pokeBallFailed),
    firstPokeBall: input.firstPokeBall ?? null,
    operations,
    capture,
  };
}
